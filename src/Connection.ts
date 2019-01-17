import {randomstring} from "./Utils";
import {Model} from "./Model";
import {XmppHandler} from "./XmppHandler";
import {RestApi} from "./RestApi";
import {compassLogger} from "./Logging";
import Builder = Strophe.Builder;
import { Strophe as Strophe, $iq, $pres} from "strophe.js";
import * as $ from "jquery";

// instruct webpack to include strophejs dependency
// even through we're not actually importing anything from it
import "strophejs-plugin-pubsub";

const COMPASS_NS = "http://iperity.com/compass";
export {COMPASS_NS};

Strophe.addNamespace('COMPASS', COMPASS_NS);
Strophe.addNamespace('PING', 'urn:xmpp:ping');

/**
 * The connection to the Compass platform.
 *
 * An object of the 'Connection' class is the entry point for the CompassJS library.
 */
export class Connection {

    /** Set to 'true' to enable logging of each incoming and outgoing XMPP stanza. Logged at 'DEBUG' logging level. */
    public logXmpp: boolean = false;

    /** Data-model tracking the state of the company that the user is a part of. See the 'Model' class for more details. */
    public readonly model: Model;

    /** Utility-class to perform requests on the REST-api of the Compass platform. */
    public rest: RestApi;

    /**
     * Add a function to be called when the Connection status changes.
     *
     * Status can be one of:
     *  Strophe.Status.ERROR - An error has occurred
     *  Strophe.Status.CONNECTING - The connection is currently being made
     *  Strophe.Status.CONNFAIL - The connection attempt failed
     *  Strophe.Status.AUTHENTICATING - The connection is authenticating
     *  Strophe.Status.AUTHFAIL - The authentication attempt failed
     *  Strophe.Status.CONNECTED - The connection has succeeded
     *  Strophe.Status.DISCONNECTED - The connection has been terminated
     *  Strophe.Status.DISCONNECTING - The connection is currently being terminated
     *  Strophe.Status.ATTACHED - The connection has been attached
     */
    public statusCallback: (status: Strophe.Status, msg: string) => void;

    /**
     * Raw access to the underlaying XMPP library that Compass.js uses.
     */
    public stropheConnection: Strophe.Connection;

    /**
     * The XMPP jid
     *
     * This is the bare jid. The full jid can be retrieved at connection.stropheConnection.jid.
     */
    public jid: string;

    /**
     * The base domain of the Compass environment we're connecting to.
     */
    public readonly basedom: string;

    private _server: string;
    private _domain: string;
    private _xmppHandler: XmppHandler;
    private _autoReconnectHandler: AutoReconnectHandler;

    /**
     * Create the connection to the Compass platform.
     *
     * @param {string} basedom - the base-domain on your compass-platform.
     * The base-domain is the address of the web-interface, with the 'www' removed.
     * For example: If the webinterface is at 'www.pbx.compass.com', then the base-domain is 'pbx.compass.com'.
     */
    constructor(basedom: string) {
        this.model = new Model();

        this.basedom = basedom;
        this._server = `uc.${this.basedom}`;
    }

    /**
     * Connect to the platform.
     *
     * After we are connected and all data is synchronized, the 'initialized' promise resolves.
     * @param {string} jid - The XMPP jid for the user. Usually in the form of <compass-username>@uc.<basedom>
     * @param {string} password - The password of the user.
     * @returns {Promise<void>} - Promise that resolves when the library is initialized. Don't try to get the model before that.
     */
    public connect(jid, password): Promise<void> {
        const promise = this._internalConnect(jid, password);
        promise.then(() => {
            // We just received a whole new model. Send 'invalidated' events on user, queue, and calls model.
            this.model.notifyConnected();
            // Connect the automatic reconnect handler.
            this._autoReconnectHandler = new AutoReconnectHandler(this, jid, password);
        });
        return promise;
    }

    /**
     * Send IQ message. Returns a Promise that resolves with the
     * IQ result element (as JQuery object).
     *
     * @param iq the IQ message, as jQuery element or as Strophe builder
     * @returns a promise that resolves with the IQ result as jQuery element
     */
    public sendIQ(iq: Element | Builder): Promise<JQuery> {
        return new Promise<JQuery>((resolve, reject) => {
            this.stropheConnection.sendIQ(iq, this._callback((res) => {
                const jres = $(res);
                resolve(jres);
            }), this._callback((res) => {
                const jres = $(res);
                reject(jres);
            }));
        });
    }

    // private methods

    private _internalConnect(jid, password, resource?): Promise<void> {

        this._setupConnection(jid);

        // Configure
        resource = resource || "Compass.js" + "_" + randomstring(10);
        const fullJid = `${jid}/${resource}`;

        // .. and connect.
        return new Promise((resolve, reject) => {
            this.stropheConnection.connect(fullJid, password, (status, condition) => {
                let msg: string;
                switch (status) {
                    case Strophe.Status.ERROR:
                        msg = 'Error occurred';
                        reject(msg);
                        break;

                    case Strophe.Status.CONNECTING:
                        msg = 'Connecting...';
                        break;

                    case Strophe.Status.CONNFAIL:
                        msg = 'Connection failed';
                        reject(msg);
                        break;

                    case Strophe.Status.AUTHENTICATING:
                        msg = 'Authenticating...';
                        break;

                    case Strophe.Status.AUTHFAIL:
                        msg = 'Authentication failed';
                        reject(msg);
                        break;

                    case Strophe.Status.CONNECTED:
                        msg = 'Connected';
                        const onConnectedPromise = this._onConnected(password);
                        onConnectedPromise.then(() => {resolve(); });
                        onConnectedPromise.catch((err) => {reject(err); });
                        break;

                    case Strophe.Status.DISCONNECTED:
                        msg = 'Disconnected';
                        break;

                    case Strophe.Status.DISCONNECTING:
                        msg = 'Disconnecting...';
                        break;

                    case Strophe.Status.ATTACHED:
                        msg = 'Attached';
                        break;

                    case Strophe.Status.REDIRECT:
                        msg = 'Redirect';
                        break;

                    case Strophe.Status.CONNTIMEOUT:
                        msg = 'Connection timeout';
                        reject(msg);
                        break;
                }

                compassLogger.info(`STATUS: Strophe connection status '${msg}', condition ${condition}`);
                if (this.statusCallback) this.statusCallback(status, msg);
            });
        });
    }

    private _onConnected(password: string): Promise<void[]> {
        // set invisible, we don't want our user to get online
        // NOTE: wait for invisible to be ack'ed (iq result) before sending presence:
        // https://github.com/processone/ejabberd/issues/2652
        this._setInvisible().then(() => {
            this._sendInitialPresence();
        });

        // Get our company-id
        return this._getCompany()
            .then((res) => {
                this._xmppHandler.setCompanyFromXmpp(res.find('>result'));
                // Subscribe to the pubsub-node where all mutations to the company data-model are published.
                return this._subscribeToPubsub()
                    .then(() => {
                        compassLogger.info('Pubsub subscribed');
                        return this._onSubscribed(password);
                    });
            })
            .catch((e) => {
               throw new Error("User has no company");
            });
    }

    /*
     * Called when subscribed to pubsub. Gets users, queues, and currently running calls.
     */
    private _onSubscribed(password): Promise<void[]> {
        const promises: Array<Promise<void>> = [];

        // get the list of users in the company.
        promises.push(this._getObjectsOfType('user')
            .then((res) => {
                this._xmppHandler.setUsersFromXmpp(res);
                const username = this.model.getUserForJid(this.jid).username;
                this.rest = new RestApi(this.basedom, username, password);
            }));
        // get the list of queues in the company.
        promises.push(this._getObjectsOfType('queue')
            .then((res) => {
                this._xmppHandler.setQueuesFromXmpp(res);
            }));
        // get the list of calls in the company
        promises.push(this._getObjectsOfType('call')
            .then((res) => {
                this._xmppHandler.setCallsFromXmpp(res);
            }));

        return Promise.all(promises);
    }

    /*
     * Generate 'GET_COMPANY' XMPP stanza
     */
    private _getCompany(): Promise<JQuery> {
        return this.sendIQ($iq({
            to : 'phone.' + this._server,
            type : 'get',
        }).c('request', {
            xmlns : COMPASS_NS,
            type: 'GET_COMPANY',
        }));
    }

    /*
     * Generate 'GET' XMPP stanza.
     */
    private _getObjectsOfType(type: string): Promise<JQuery> {
        return this.sendIQ($iq({
            to : 'phone.' + this._server,
            type : 'get',
        }).c('request', {
            xmlns : COMPASS_NS,
            type: "GET",
        }).c('filter', {
            type: type,
        })).then((res) => {
            return res.find('>result').children();
        });
    }

    private _sendInitialPresence() {
        this.stropheConnection.send($pres().c('priority').t('1'));
    }

    private _setInvisible(): Promise<[JQuery, JQuery]> {
        const createListIq = $iq({type : 'set'})
            .c('query', {xmlns : 'jabber:iq:privacy'})
            .c('list', {name : 'invisible'})
            .c('item', {action : 'deny', order : '1'})
            .c('presence-out', {});
        const activateListIq = $iq({type : 'set'})
            .c('query', {xmlns : 'jabber:iq:privacy'})
            .c('active', {name : 'invisible'});
        
        return Promise.all([this.sendIQ(createListIq), this.sendIQ(activateListIq)]);
    }

    private _setupConnection(jid) {

        if (jid.indexOf("@") === -1) {
            throw new Error("JID does not contain an \"@\"");
        }

        // Now we have the jid, Create XMPP-handler
        this._xmppHandler  = new XmppHandler(this.model);

        // configuration
        this._domain = jid.substring(jid.indexOf('@') + 1);
        this.jid = jid;

        // Setup strophe connection
        const bosh_service = `https://bosh.${this.basedom}/http-bind`;
        this.stropheConnection = new Strophe.Connection(bosh_service);

        if (this.logXmpp) {
            this.stropheConnection.rawInput = (txt) => compassLogger.debug('IN: ' + txt);
            this.stropheConnection.rawOutput = (txt) => compassLogger.debug('OUT: ' + txt);
        }
    }

    /*
     * Subscribe to the pubsub-node where all mutations to the company data-model are published.
     */
    private _subscribeToPubsub(): Promise<void> {
        const companyId = this.model.company.id;

        return new Promise ((resolve, reject) => {
            let handlerId;
            const messageCb = (stanza: JQuery) => {
                const state = stanza.find('subscription').attr('subscription');
                if (state && state === 'subscribed') {
                    resolve();
                }

                this._onReceivePubsub(stanza);

                // don't call again
                this.stropheConnection.deleteHandler(handlerId);
            };

            // Attach callbacks...
            const pubsub = (this.stropheConnection as any).pubsub;
            handlerId = this.stropheConnection.addHandler(
                this._callback((stanza) => messageCb($(stanza))),
                null,
                'message',
                null,
                null,
                pubsub.service);

            compassLogger.info('Subscribing to ' + companyId);
            pubsub.subscribe(
                companyId,
                null,
                this._callback((event) => this._onReceivePubsub($(event))),
                (_) => {},  // this is the 'pending' response
                (e) => reject(e),
                false);
        });
    }

    private _onReceivePubsub(stanza: JQuery) {
        $('item', stanza).toArray()
            .map((itemXml) => $(itemXml))
            .forEach(item => {
                const contents = item.children();
                const nodeName = contents[0].nodeName;
                if (nodeName.toLowerCase() === 'notification') {
                    this._xmppHandler.handleNotification(contents);
                } else {
                    compassLogger.warn("Unknown pubsub item: " + nodeName);
                }
            });
    }

    /*
     * Callback wrapper with
     * (1) proper error reporting (Strophe swallows errors)
     * (2) always returns true to keep the handler installed
     */
    private _callback(cb: (...args: any[]) => any) {
        return (...args) => {
            try {
                cb.apply(this, args);
            } catch (e) {
                compassLogger.error('ERROR: ' + (e.stack ? e + "\n" + e.stack : e));
            }

            // Return true to keep calling the callback.
            return true;
        };
    }
}

class AutoReconnectHandler {
    private readonly _pingIntervalMs = 30000;
    private readonly _pingTimeoutMs = 5000;

    private readonly _connection: Connection;
    private readonly _jid: string;
    private readonly _password: string;

    private _pingTimer;
    private _pingTimeoutTimer;
    private _lastPingSentTimestamp = 0;

    /**
     * Automatically reconnect if Compass not responding to XMPP pings.
     * @param {Connection} connection - The Connection object.
     * @param {string} jid - The XMPP jid for the user. Usually in the form of <compass-username>@uc.<basedom>
     * @param {string} password - The password of the user.
     */
    constructor(connection, jid, password) {
        this._connection = connection;
        this._jid = jid;
        this._password = password;

        compassLogger.debug(`Starting XMPP ping every ${this._pingIntervalMs / 1000}s, will re-connect automatically if no response within ${this._pingTimeoutMs / 1000}s.`);
        this._pingTimer = setInterval(() => this.doPing(), this._pingIntervalMs);
    }

    private doPing() {
        const sendPing = this._connection.sendIQ($iq({
            to : 'phone.uc.' + this._connection.basedom,
            type : 'get',
        }).c('ping', {
            xmlns : Strophe.NS.PING,
        }));

        compassLogger.debug("XMPP ping sent");
        this._lastPingSentTimestamp = new Date().valueOf();
        this._pingTimeoutTimer = setTimeout(() => this.pingLate(), this._pingTimeoutMs);
        sendPing.then( () => this.pingReceived());
    }

    private pingReceived() {
        compassLogger.debug(`Received ping after ${new Date().valueOf() - this._lastPingSentTimestamp} ms`);
        clearTimeout(this._pingTimeoutTimer);
        this._pingTimeoutTimer = undefined;
        this._lastPingSentTimestamp = 0;
    }

    private pingLate() {
        compassLogger.warn("Didn't receive XMPP ping in time. Reconnecting...");
        clearTimeout(this._pingTimeoutTimer);
        clearTimeout(this._pingTimer);
        this._pingTimeoutTimer = undefined;
        this._pingTimer = undefined;
        this._connection.stropheConnection.disconnect();
        this._connection.stropheConnection.reset();
        this._connection.connect(this._jid, this._password);
    }


}
