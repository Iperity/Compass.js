import {Event, EventType} from './Events';
import {compassLogger} from "./Logging";
import {
    Call,
    CallEndReason,
    CallPoint,
    Company,
    CompassObject,
    Model,
    Queue,
    QueueCallPoint,
    QueueMember,
    Side,
    User,
    UserCallPoint,
} from "./Model";
import {ObjectType, parseBoolean, parseNumberOrNull, ParserRegistry} from "./Parsers";
import * as $ from "jquery";

/**
 * Retrieves XMPP XML stanzas, and modifies the Model accordingly.
 */
export class XmppHandler {
    protected _handler: XmppNotificationHandler;
    protected parser: ParserRegistry;

    /**
     * The model that the XmppHandler will modify based on XMPP input.
     */
    public model: Model;

    /**
     * Create the XmppHandler
     * @param {Model} model - The model that the XmppHandler will modify based on XMPP input.
     */
    constructor(model: Model) {
        this.model = model;
        this.parser = new ParserRegistry(this.model);
        this._handler = new XmppNotificationHandler(this, this.parser);
    }

    /**
     * Process the result of a GET_COMPANY request.
     * @param {JQuery} elem - the result of a GET_COMPANY request.
     */
    public setCompanyFromXmpp(elem: JQuery) {
        const company = this.parser.parse(elem, ObjectType.Company) as Company;
        this.setCompany(company);

        compassLogger.info('Discovered company: ' + this.model.company.name + ' (' + this.model.company.id + ')');
    }

    /**
     * Process the result of a GET request with type == users
     * @param {JQuery} users - the result of a GET request with type == user
     */
    public setUsersFromXmpp(users: JQuery) {
        compassLogger.info('Received users: ' + users.length);
        this.model.users = {};
        users.toArray().map((elem) => $(elem)).forEach((userElem) => {
            const user = this.parser.parse(userElem, ObjectType.User) as User;
            this.addUser(user, false);
        });
    }

    /**
     * Process the result of a GET request with type == call
     * @param {JQuery} callsElem - the result of a GET request with type == call
     */
    public setCallsFromXmpp(callsElem: JQuery) {
        compassLogger.info('Received calls: ' + callsElem.length);

        this.model.calls = {};

        const hasParent = (e: JQuery) => e.find('>properties >QueueCallForCall').length;
        const addCall = (e: JQuery) => {
            const call = this.parser.parse(e, ObjectType.Call) as Call;
            this.addCall(call, false);
        };

        const calls = callsElem.toArray().map(e => $(e));

        // make sure to parse parent calls before child calls (#24)
        calls.filter(e => !hasParent(e)).forEach(addCall);
        calls.filter(e => hasParent(e)).forEach(addCall);
    }

    /**
     * Process the result of a GET request with type == queue
     * @param {JQuery} queues - the result of a GET request with type == queue
     */
    public setQueuesFromXmpp(queues: JQuery) {
        compassLogger.info('Received queues: ' + queues.length);

        this.model.queues = {};
        queues.toArray().map((elem) => $(elem)).forEach((queueElem) => {
            const queue = this.parser.parse(queueElem, ObjectType.Queue) as Queue;
            this.addQueue(queue, false);
        });
    }

    /**
     * Handle a Compass XMPP pubsub notification.
     * @param {JQuery} not - The XMPP pubsub notification
     */
    public handleNotification(not: JQuery) {
        this._handler.handleNotification(not);
    }

    /*
     * Mutable Model
     *
     * These are all the utility functions for modifying the model.
     */

    /**
     * Set the company in the model.
     * @param {Company} company - The company to set in the model.
     */
    public setCompany(company: Company) {
        this.model.company = company;
    }

    /**
     * Add an user to the model
     * @param {User} user - the user to modify.
     * @param {boolean} [sendNotification] - set to true to notify observers. Default: true
     */
    public addUser(user: User, sendNotification = true) {
        this.model.users[user.id] = user;
        if (sendNotification) {
            this.model.notify(new Event(user, EventType.Added));
        }
    }

    /**
     * Remove an user from the model
     * @param {string} userId - the userId of the user to remove.
     * @param {boolean} [sendNotification] - set to true to notify observers. Default: true
     */
    public removeUser(userId: string, sendNotification = true) {
        const user = this.model.users[userId];
        if (!user) return;
        delete this.model.users[userId];
        if (sendNotification) this.model.notify(new Event(user, EventType.Removed));
    }

    /**
     * Add a call to the model.
     * @param {Call} call - the call to add.
     * @param {boolean} [sendNotification] - set to true to notify observers. Default: true
     */
    public addCall(call: Call, sendNotification = true) {
        this.model.calls[call.id] = call;
        if (sendNotification) this.sendEventsCallAdded(call);
    }

    /**
     * Remove a call from the model.
     * @param {string} callId - the callId of the call to remove.
     * @param {CallEndReason} reason - reason for removing
     * @param {boolean} [sendNotification] - set to true to notify observers. Default: true
     */
    public removeCall(callId: string, reason: CallEndReason, sendNotification = true) {
        const call = this.model.calls[callId];
        if (!call) return;
        delete this.model.calls[callId];

        if (sendNotification) this.sendEventsCallRemoved(call, {reason: reason});
    }

    /**
     * Add a queue to the model.
     * @param {Queue} queue - the queue to add.
     * @param {boolean} [sendNotification] - set to true to notify observers. Default: true
     */
    public addQueue(queue: Queue, sendNotification = true) {
        this.model.queues[queue.id] = queue;
        if (sendNotification) {
            this.model.notify(new Event(queue, EventType.Added));
        }
    }

    /**
     * Remove a queue from the model
     * @param {string} queueId - the queueId of the queue to remove.
     * @param {boolean} [sendNotification] - set to true to notify observers. Default: true
     */
    public removeQueue(queueId: string, sendNotification = true) {
        const queue = this.model.queues[queueId];
        if (!queue) return;
        delete this.model.queues[queueId];
        if (sendNotification) this.model.notify(new Event(queue, EventType.Removed));
    }

    /**
     * Utility function to remove an element from an array.
     * @param arr - the array to remove the element from.
     * @param element - the element to be removed
     * @returns {boolean} - retruns true if the element to be removed existed in the array.
     */
    public deleteFromArray(arr, element) {
        const index = arr.indexOf(element);
        if (index > -1) {
            arr.splice(index, 1);
            return true;
        }
        return false;
    }

    /* Call events */
    /**
     * Send the appropriate events after a new call was added to the model.
     * @param {Call} call - The call to send the events for.
     * @param {any} data - additional data for event
     */
    public sendEventsCallAdded(call: Call, data: any = null) {
        this.sendEventsOnCallAndEndpoint(call, true, data);
    }

    /**
     * Send the appropriate events after a call was removed from the model.
     * @param {Call} call - The call to send the events for
     * @param {any} data - additional data for event
     */
    public sendEventsCallRemoved(call: Call, data: any = null) {
        this.sendEventsOnCallAndEndpoint(call, false, data);
    }

    /**
     * Send events on all callpoints of a call
     * @param {Call} call - the call to send the events for.
     * @param {boolean} added - whether the call was added or removed
     * @param {any} data - event data to send with add/remove event
     */
    public sendEventsOnCallAndEndpoint(call: Call, added: boolean, data: any = null) {
        if (added) {
            // add call before callpoints
            call.domain.notify(new Event(call, EventType.Added, data));
        }
        this.sendEventsForCallPoint(call, call.source, added);
        this.sendEventsForCallPoint(call, call.destination, added);
        if (!added) {
            // remove call after endpoints
            call.domain.notify(new Event(call, EventType.Removed, data));
        }
    }

    /**
     * Send events for a single callPoint.
     * @param {Call} call - the call that the callPoint is part of.
     * @param {CallPoint} callPoint - the callpoint to send the events for.
     * @param {boolean} added - whether the callpoint was added or removed from the call
     */
    protected sendEventsForCallPoint(call: Call, callPoint: CallPoint, added: boolean) {

        const callEventType = added ? EventType.CallAdded : EventType.CallRemoved;

        if (callPoint instanceof UserCallPoint) {
            const userCallPoint = callPoint as UserCallPoint;
            const user = userCallPoint.getUser();
            if (!user) {
                compassLogger.warn(`Could not deliver event; user ${userCallPoint.userId} non-existing`);
                return;
            }

            // Notification on User
            user.domain.notify(new Event(user, callEventType, {call: call}));

            // Notification on Call
            const userEventType = added ? EventType.UserAdded : EventType.UserRemoved;
            call.domain.notify(new Event(call, userEventType, {user: user}));

        } else if (callPoint instanceof QueueCallPoint) {

            const queueCallPoint = callPoint as QueueCallPoint;
            const queue = queueCallPoint.getQueue();
            if (!queue) {
                compassLogger.warn(`Could not deliver event; queue ${queueCallPoint.queueId} non-existing`);
                return;
            }

            // Notification on Queue
            queue.domain.notify(new Event(queue, callEventType, {call: call}));

            // Notification on Call
            const queueEventType = added ? EventType.QueueAdded : EventType.QueueRemoved;
            call.domain.notify(new Event(call, queueEventType, {queue: queue}));

        } else {
            // No other Callpoint-types have observables that need handling.
        }
    }

    /**
     * Send events for when a callpoint is replaced (ie. not just a state change).
     *
     * @param {Call} call - The call that the callpoint is a part of.
     * @param {CallPoint} origCallpoint - Callpoint before the update.
     * @param {CallPoint} newCallpoint - Callpoint after the update.
     */
    public sendEventsCallUpdated(call: Call, origCallpoint: CallPoint, newCallpoint: CallPoint) {
        this.sendEventsForCallPoint(call, origCallpoint, false);
        this.sendEventsForCallPoint(call, newCallpoint, true);
    }
}

enum CallUpdateEventType {
    source = 'SOURCE',
    destination = 'DESTINATION',
    state = 'STATE',
    both = 'BOTH',
}

enum XmlCallSide {
    source = 'SOURCE',
    destination = 'DESTINATION',
}

function convertCallSide(side: XmlCallSide): Side {
    return side === XmlCallSide.source ? Side.source : Side.destination;
}

/**
 * Handle XMPP notifications.
 */
class XmppNotificationHandler {
    protected _xmppHandler: XmppHandler;
    protected _parser: ParserRegistry;

    /**
     * Create the XmppNotificationHandler
     * @param {XmppHandler} model - the model.
     * @param {ParserRegistry} parser - an instance of AnyCompassObjectParser
     */
    constructor(model: XmppHandler, parser: ParserRegistry) {
        this._xmppHandler = model;
        this._parser = parser;
    }

    /**
     * Handle a Compass XMPP notification.
     * @param {JQuery} not - the Compass XMPP notification.
     */
    public handleNotification(not: JQuery) {
        compassLogger.debug("Notification Received");
        const type = not.attr('type');
        const typeLevel = this.getNotificationTypeUpToLevel(type, 1);
        switch (typeLevel) {
            case 'notification.call':
                this.handleCallNotification(not);
                break;
            case 'notification.queueMember':
                this.handleQueueMemberNotification(not);
                break;
            case 'notification.queue':
                this.handleQueueNotification(not);
                break;
            case 'notification.user':
                this.handleUserNotification(not);
                break;
            default:
                compassLogger.warn(`Don't know how to handle notification type ${type} .`);
                break;
        }
    }

    protected handleCallNotification(not: JQuery) {
        compassLogger.debug("Call Notification Received");
        const type = not.attr('type');
        const typeLevel = this.getNotificationTypeUpToLevel(type, 2);
        switch (typeLevel) {
            case 'notification.call.start':
                this.handleCallStartNotification(not);
                break;
            case 'notification.call.end':
                this.handleCallEndNotification(not);
                break;
            case 'notification.call.update':
                this.handleCallUpdateNotification(not);
                break;
            case 'notification.call.stepresult':
                this.handleCallStepResultNotification(not);
                break;
            default:
                compassLogger.warn(`Don't know how to handle notification type ${type} .`);
                break;
        }
    }

    protected handleCallStartNotification(not: JQuery) {
        compassLogger.debug("Call Start Notification Received");
        const callElem = not.find(">call");
        const call = this._parser.parse(callElem, ObjectType.Call) as Call;
        this._xmppHandler.addCall(call, true);
    }

    protected handleCallEndNotification(not: JQuery) {
        compassLogger.debug("Call End Notification Received");
        const callId = not.find(">callId").text();
        const reason = not.find(">endReason").text() as CallEndReason;
        if (!callId) throw new Error("No 'callId' in notification.call.end element.");
        this._xmppHandler.removeCall(callId, reason, true);
    }

    protected handleCallUpdateNotification(not: JQuery) {
        compassLogger.debug("Call Update Notification Received");

        const callElem = not.find(">call");
        const updateType = not.find('>updateType').text() as CallUpdateEventType;
        const callFromNotification = this._parser.parse(callElem, ObjectType.Call) as Call;
        const call = this._xmppHandler.model.calls[callFromNotification.id];

        if (!call) {
            compassLogger.debug(`Received update notification for call ${callFromNotification.id} we didn't know existed yet. Adding now.`);
            this._xmppHandler.addCall(callFromNotification, true);
            return;
        }

        // CallUpdates come in a multitude of variations.
        // 1) State change; call state and/or callpoint state has changed
        // 2) Endpoint change; source/destination/both are changed
        //    This indicates a REPLACEMENT of the callpoint, not just a state change.
        //
        // During an endpoint change, the (call)state may change as well.

        const oldSource = call.source;
        const oldDest = call.destination;
        const oldState = call.state;
        let stateChanged = false;
        let sourceChanged = false;
        let destinationChanged = false;

        switch (updateType) {
            // Source-callpoint changed.
            case CallUpdateEventType.source:
                call.source = callFromNotification.source;
                this._xmppHandler.sendEventsCallUpdated(call, oldSource, call.source);
                sourceChanged = true;
                break;

            // Destination-callpoint changed.
            case CallUpdateEventType.destination:
                call.destination = callFromNotification.destination;
                this._xmppHandler.sendEventsCallUpdated(call, oldDest, call.destination);
                destinationChanged = true;
                break;

            // Source & destination changed.
            case CallUpdateEventType.both:
                call.source = callFromNotification.source;
                this._xmppHandler.sendEventsCallUpdated(call, oldSource, call.source);
                sourceChanged = true;

                call.destination = callFromNotification.destination;
                this._xmppHandler.sendEventsCallUpdated(call, oldDest, call.destination);
                destinationChanged = true;
                break;

            // State (call state or callpoint state) changed.
            case CallUpdateEventType.state:
                // handled below
                break;

            default:
                compassLogger.warn(`Unknown call updateType ${updateType}`);
                break;
        }

        // Check if call state is updated (this can also happen during a source/destination callpoint change)
        if (call.state !== callFromNotification.state) {
            call.state = callFromNotification.state;
            stateChanged = true;
        }

        // Check if callpoint state is updated (without actual callpoint replace)
        if (!sourceChanged && call.source.state !== callFromNotification.source.state) {
            // replace callpointcompletely, so we have immutable callpoints
            call.source = callFromNotification.source;
            sourceChanged = true;
        }
        if (!destinationChanged && call.destination.state !== callFromNotification.destination.state) {
            // replace callpoint completely, so we have immutable callpoints
            call.destination = callFromNotification.destination;
            destinationChanged = true;
        }

        // Send out notifications on call
        if (stateChanged) {
            call.domain.notify(new Event(call, EventType.Changed,
                { updateType: 'state', oldState: oldState}));
        }
        if (sourceChanged) {
            call.domain.notify(new Event(call, EventType.Changed,
                { updateType: 'source', oldCallpoint: oldSource}));
        }
        if (destinationChanged) {
            call.domain.notify(new Event(call, EventType.Changed,
                { updateType: 'destination', oldCallpoint: oldDest}));
        }
    }

    protected handleCallStepResultNotification(not: JQuery) {
        compassLogger.debug("CallStepResult notification received");

        const callId = not.find('>callId').text();
        const call = this._xmppHandler.model.calls[callId];
        if (!call) {
            compassLogger.warn(`Received stepResult notification for call ${callId} we don't know about.`);
            return;
        }

        const side = not.find('>side').text() as XmlCallSide;
        const callpoint = this._parser.parse(not.find('>callpoint'), ObjectType.CallPoint);
        const result = not.find('>result').text();

        call.domain.notify(new Event(call, EventType.Changed, {
            updateType: 'stepResult',
            side: convertCallSide(side),
            callpoint: callpoint,
            result: result,
        }));
    }

    protected handleUserNotification(not: JQuery) {
        compassLogger.debug("User Notification Received");

        const type = not.attr('type');
        const userId = not.find('>userId').text();
        
        if (type === 'notification.user.create') {
            // user should *not* exist
            if (this._xmppHandler.model.users[userId]) {
                compassLogger.warn(`Received ${type} for ${userId}, but user with that userId already exists.`);
                return;
            }
            const userElem = not.find(">user");
            const userFromNotification = this._parser.parse(userElem, ObjectType.User) as User;
            this._xmppHandler.addUser(userFromNotification, true);
            return;
        }
        
        // for all other user-related notifications, the user must exist
        const user = this._xmppHandler.model.users[userId];
        if (!user) {
            compassLogger.warn(`Received ${type} for ${userId}, but user with that userId does not exists.`);
            return;
        }

        switch (type) {
            case 'notification.user.update':
                this.handlePropertiesChanged(user, not.find('>propertyChange'), this.handleUserPropertyUpdate);
                break;
            case 'notification.user.destroy':
                this._xmppHandler.removeUser(userId);
                break;
            default:
                compassLogger.warn(`Unknown user notification type ${type}`);
                break;
        }
    }

    protected handleQueueMemberNotification(not: JQuery) {
        compassLogger.debug("QueueMember Notification Received");
        const type = not.attr('type');
        const memberElem = not.find(">member");
        const queueId = memberElem.find(">queueId").text();
        const userId = memberElem.find(">userId").text();
        const priority = memberElem.find(">priority").text();
        const pausedSince = memberElem.find(">pausedSince").text();

        const queue = this._xmppHandler.model.queues[queueId];
        const user = this._xmppHandler.model.users[userId];

        if (!user) {
            compassLogger.warn(`Could not deliver event; user ${userId} non-existing`);
            return;
        } else if (!queue) {
            compassLogger.warn(`Notification ${type} for queue ${queueId} not processed, becasue queue not found in domain.`);
            return;
        }

        let queueMember;
        switch (type) {
            case 'notification.queueMember.enter':
                if (queue.getQueueMember(userId)) {
                    compassLogger.warn(`Received ${type} for userId ${userId}, but user already in queue.`);
                    return;
                }
                queueMember = new QueueMember(userId, queueId, priority, pausedSince, this._xmppHandler.model);
                queue.queueMembers.push(queueMember);
                queue.domain.notify(new Event(queue, EventType.UserAdded, {user: user}));
                user.domain.notify(new Event(user, EventType.QueueAdded, {queue: queue}));
                break;

            case 'notification.queueMember.leave':
                queueMember = queue.getQueueMember(userId);
                this._xmppHandler.deleteFromArray(queue.queueMembers, queueMember);
                queue.domain.notify(new Event(queue, EventType.UserRemoved, {user: user}));
                user.domain.notify(new Event(user, EventType.QueueRemoved, {queue: queue}));
                break;

            case 'notification.queueMember.update':
                queueMember = queue.getQueueMember(userId);
                const wasPaused = queueMember.isPaused();
                queueMember.setPausedSince(pausedSince);
                queueMember.setPriority(priority);
                if (queueMember.isPaused() !== wasPaused) {
                    // Pause state changed
                    const eventType = queueMember.isPaused() ? EventType.Paused : EventType.Unpaused;
                    queue.domain.notify(new Event(queue, eventType, {user: user}));
                    user.domain.notify(new Event(user, eventType, {queue: queue}));
                }
                break;

            default:
                compassLogger.warn(`Don't know how to handle notification type ${type} .`);
                break;
        }
    }

    protected handleQueueNotification(not: JQuery) {
        compassLogger.debug("Queue Notification Received");

        const type = not.attr('type');
        const queueCallElem = not.find(">queueCall");
        const queueId = not.find(">queueId").text();
        const callId = queueCallElem.find(">callId").text();
        const call = this._xmppHandler.model.calls[callId];
        const queue = this._xmppHandler.model.queues[queueId];

        if (queue) {
            switch (type) {
                case 'notification.queue.call.enter':
                    compassLogger.debug("Queue Call Enter Notification Received");
                    // No need to send events, the callpoint update has sent CallAdded on the queue
                    break;

                case 'notification.queue.call.leave':
                    compassLogger.debug("Queue Call Leave Notification Received");
                    // No need to send events, the callpoint update has sent CallRemoved on the queue
                    break;

                case 'notification.queue.update':
                    this.handlePropertiesChanged(queue, not.find('>propertyChange'), this.handleQueuePropertyUpdate);
                    break;

                case 'notification.queue.destroy':
                    this._xmppHandler.removeQueue(queueId, true);
                    break;

                default:
                    compassLogger.warn(`Don't know how to handle notification type ${type} .`);
                    break;
            }
        } else {
            switch (type) {
                case 'notification.queue.create':
                    if (this._xmppHandler.model.queues[queueId]) {
                        compassLogger.warn(`Received ${type} for ${queueId}, but queue with that queueId already exists.`);
                        return;
                    }
                    const queueElem = not.find(">queue");
                    const queueFromNotification = this._parser.parse(queueElem, ObjectType.Queue) as Queue;
                    this._xmppHandler.addQueue(queueFromNotification, true);
                    break;
                default:
                    compassLogger.warn(`Notification ${type} for queue ${queueId} not processed, becasue queue not found in domain.`);
                    break;
            }

        }
    }

    protected handlePropertiesChanged<T extends CompassObject>(obj: T,
                                                               elements: JQuery,
                                                               translateToModel: ((obj: T, p: string, v: string) => void)) {

        elements.toArray().map((elem) => $(elem)).forEach((elem) => {

            const propertyName = elem.find('>name').text();
            const oldValue = elem.find('>oldValue').text();
            const newValue = elem.find('>newValue').text();

            // translate property changes to our model
            translateToModel(obj, propertyName, newValue);

            obj.domain.notify(new Event(obj, EventType.PropertyChanged, {
                name: propertyName,
                oldValue: oldValue,
                newValue: newValue,
            }));
        });
    }

    protected handleUserPropertyUpdate(user: User, propertyName: string, newValue: string) {
        switch (propertyName) {
            case 'name':
                user.name = newValue;
                break;
            case 'loggedIn':
                user.loggedIn = parseBoolean(newValue);
                break;
            case 'location':
                user.phoneId = parseNumberOrNull(newValue);
                break;
            default:
                compassLogger.debug(`Got user property update: ${propertyName} is now '${newValue}'`);
                break;
        }
    }

    protected handleQueuePropertyUpdate(queue: Queue, propertyName: string, newValue: string) {
        switch (propertyName) {
            case 'name':
                // NOTE: queue-name changes are sent from Compass r-2018c
                queue.name = newValue;
                break;
            default:
                compassLogger.debug(`Got queue property update: ${propertyName} is now '${newValue}'`);
                break;
        }
    }

    /*
     * Utility
     */

    /*
     * Get the notification-type at level 'level', 0 is the first level.
     */
    protected getNotificationTypeUpToLevel(type: string, level: number) {
        if (level < 0) throw new Error(`getTypeLevel: level ${level} is below 0.`);
        const dotSeparated = type.split(".");
        dotSeparated.splice(level + 1);
        return dotSeparated.join(".");
    }
}
