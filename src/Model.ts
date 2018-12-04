import {Observable, Subject} from "rxjs";
import {Event, EventType} from "./Events";

/**
 * The states that a call can be in. (See in Call.state)
 */
export enum CallState {
    connecting = "CONNECTING",
    ringing = "RINGING",
    answered = "ANSWERED",
    on_hold = "ON_HOLD",
    disconnected = "DISCONNECTED",
}

/**
 * The states that a callpoint can be in. (See in Callpoint.state)
 */
export enum CallPointState {
    connecting = "CONNECTING",
    ringing = "RINGING",
    answered = "ANSWERED",
    inactive = "INACTIVE",
    disconnected = "DISCONNECTED",
}

/**
 * The reasons for a call to end.
 */
export enum CallEndReason {
    sourceHangup = "SOURCE_HANGUP",
    destinationHangup = "DESTINATION_HANGUP",
    destinationBusy = "DESTINATION_BUSY",

    // not in xsd, but can be used when library doesn't know the reason
    unknown = 'unknown',
}

/**
 * The sides that a callpoint can have in a call.
 *
 * Please note: Especially in more complicated call scenario's, 'source' is not always the initiator of the call,
 * and 'destination' is not always the receiver of the call. For example, a call-transfer can swap a source or destination
 * with another Callpoint.
 */
export enum Side {
    source,
    destination,
}

/**
 * Given a side from the Side enum, het the otherwise
 *
 * @param {Side} a side
 * @returns {Side} - the other side compared to the 'side' parameter.
 */
export function OtherSide(side: Side) {
    return side === Side.source ? Side.destination : Side.source;
}

export abstract class CompassObject {
    /**
     * The model that this object is part of.
     */
    public domain: Model;
    /**
     * identifier of the object.
     */
    public id: string;
    /**
     * contains the XMPP stanza (XML) that this object was originally created from.
     */
    public xmlElement: JQuery;

    /**
     * @param {string} id - the identifier of the object.
     * @param {JQuery} xmlElement - the XMPP stanza that the object has been parsed from.
     * @param {Model} domain - the model that the object is part of.
     */
    constructor(id: string, xmlElement: JQuery, domain: Model) {
        this.id = id;
        this.domain = domain;
        this.xmlElement = xmlElement;
    }

    public toString() {
        return `${this.constructor.name}(${this.id})`;
    }
}

/**
 * Class for objects representing a Company
 */
export class Company extends CompassObject {
    /**
     * The name of the company
     */
    public name: string;
}

/**
 * Class for objects representing a Call
 */
export class Call extends CompassObject {
    /**
     * DEPRECATED: Current state of the call.
     *
     * Please note; a state-per-call is an oversimplified view, and is deprecated.
     * Use the 'state' member of the sourceCallpoint and destinationCallpoint instead.
     */
    public state: CallState;

    /**
     * The source callpoint of the call.
     */
    public source: CallPoint;

    /**
     * The destination callpoint of the call.
     */
    public destination: CallPoint;

    /**
     * The parent call, if the call has a parent call.
     * 
     * If this is a dial attempt from the queue to an agent, the parent call is
     * the queue call.
     */
    public parentCall: Call;

    public getEndpoint(side: Side) {
        return side === Side.source ? this.source : this.destination;
    }
}

/**
 * The types of callpoints. Some of these have specific subclasses (QueueCallPoint), but some
 * are represented by just a CallPoint instance.
 */
export enum CallPointType {
    unknown = "Unknown",
    user = "User",
    dialplan = "Dialplan",
    external = "External",
    queue = "Queue",
}

/**
 * Class for objects representing a side (either source or destination) of a Call.
 */
export class CallPoint extends CompassObject {

    /**
     * The callpoint-type for the Callpoint.
     */
    public type: CallPointType;

    /**
     * The calling-state for the Callpoint.
     */
    public state: CallPointState;

    /**
     * Creation time; unix timestamp.
     */
    public timeCreated: number;

    /**
     * Start time - when the callpoint was picked up; unix timestamp or 0.
     */
    public timeStarted: number;

    /**
     * End time - when the callpoint has been hung up.
     * TODO: Lisa is only setting this for terminated calls that are retrieved through
     * an IQ get. If we want to expose this, we should fill it ourselves.
     */
    // public timeEnded: number;

    /**
     * Create a CallPoint
     *
     * @param {string} id - the identifier of the object.
     * @param {JQuery} xmlElement - the XMPP stanza that the object has been parsed from.
     * @param {Model} domain - the model that the object is part of.
     */
    constructor(id: string, xmlElement: JQuery, domain: Model) {
        super(id, xmlElement, domain);
        this.state = CallPointState.inactive;
    }

    /**
     * Get the duration (in seconds) since the call reached this callpoint.
     */
    public getDuration(): number {
        return getDurationFrom(this.timeCreated);
    }

    /**
     * Get the duration (in seconds) since this callpoint has been *answered*,
     * or NaN if the callpoint has not yet been answered.
     */
    public getAnsweredDuration(): number {
        return getDurationFrom(this.timeStarted);
    }
}

/**
 * Class for objects representing a side of a Call that is an external caller.
 */
export class ExternalCallPoint extends CallPoint {

    /**
     * Caller id number.
     */
    public number: string;

    /**
     * Caller id name.
     */
    public name: string;
}

/**
 * Class for objects representing a side of a Call that is in the dialplan.
 */
export class DialplanCallPoint extends CallPoint {

    /**
     * The extension/number that was dialed (optional).
     */
    public exten: string;

    /**
     * A description of the dialplan position (optional).
     */
    public description: string;
}


/**
 * Class for objects representing a side of a Call that is an user.
 */
export class UserCallPoint extends CallPoint {
    public userId: string;

    /**
     * Get the user that is part of the cool.
     * @returns {User} - User that is part of the call.
     */
    public getUser(): User {
        return this.domain.users[this.userId];
    }
}

/**
 * Class for objects representing a side of a call that is a call-queue.
 */
export class QueueCallPoint extends CallPoint {
    public queueId: string;
    public queueName: string;

    /**
     * Get the Queue that is part of the call.
     *
     * @returns {Queue} - The queue that is part of the call.
     */
    public getQueue(): Queue {
        return this.domain.queues[this.queueId];
    }
}

export enum Language {
    nl = 'nl',
    en = 'en',
}

/**
 * Class for objects representing an User.
 */
export class User extends CompassObject {

    /**
     * Name of the user.
     */
    public name: string;

    /**
     * Is the user logged on to a phone?
     */
    public loggedIn: boolean;

    /**
     * Extensions associated with the user.
     * @type {string[]}
     */
    public extensions: string[] = [];

    /**
     * The XMPP jid of the user.
     */
    public jid: string;

    /**
     * The username of the user
     *
     * The user can use his username to logon to ancillary services on the plaform, such as the operator or the webinterface.
     */
    public username: string;

    /**
     * The phone id on which the user is logged on, if any.
     */
    public phoneId: number;

    /**
     * The language of the user.
     */
    public language: Language;

    /**
     * The email address of the user.
     */
    public contact: string;

    /**
     * Get the queues that the user is logged on to.
     *
     * @returns {Queue[]} - The queues that the user is logged on to.
     */
    public getQueues(): Queue[] {
        return Object.values(this.domain.queues).filter((queue) => {
            return queue.isUserInQueue(this.id);
        });
    }

    /**
     * Get the queues that the user is logged on to, but paused in.
     *
     * When a user is paused in a queue, the user does not receive calls from that queue.
     * @returns {Queue[]} - The queues that the user is paused in.
     */
    public getPausedQueues(): Queue[] {
        return Object.values(this.domain.queues).filter((queue) => {
            return queue.isUserPausedInQueue(this.id);
        });
    }

    /**
     * Get the calls that the user is part of.
     *
     * @returns {Call[]} - Array of calls that the user is part of. Empty array if user not currently in any calls.
     */
    public getCalls(): Call[] {
        const isUserInCallpoint = (callPoint: CallPoint) => (callPoint instanceof UserCallPoint && callPoint.userId === this.id);
        return Object.values(this.domain.calls).filter(call => (isUserInCallpoint(call.source) || isUserInCallpoint(call.destination)));
    }
}

/**
 * Represents the relationship of an user being a member of a queue.
 */
export class QueueMember {
    public userId: string;
    public queueId: string;
    public priority: number  = 0;
    public pausedSince: number  = 0;
    public domain: Model;

    /**
     * Create a QueueMember
     *
     * @param {string} id - the identifier of the object.
     * @param {string} userId - the id of the user that is logged on to the queue.
     * @param {string} queueId - the id of the queue that the user is logged onto.
     * @param {string} priority - numerical priority of the user in the queue, from 1-3. Accepts a string for parsing convenience.
     * @param {string} pausedSince - timestamp since user has been paused in milliseconds from epoch. Accepts a string for parsing convenience. 0 for not paused.
     * @param {Model} domain - the model that the object is part of.
     */
    constructor(userId: string, queueId: string, priority: string, pausedSince: string, domain: Model) {
        this.userId = userId;
        this.queueId = queueId;
        this.setPriority(priority);
        this.setPausedSince(pausedSince);
        this.domain = domain;
    }

    /**
     * Set the priority of the user in the queue.
     *
     * @param {string} priority - numerical priority of the user in the queue, from 1-3. Accepts a string for parsing convenience.
     */
    public setPriority(priority: string) {
        const parsedPriority = parseInt(priority);
        if (!isNaN(parsedPriority)) this.priority = parsedPriority;
    }

    /**
     * set the time since which an user has been paused.
     *
     * @param {string} pausedSince - timestamp since user has been paused in milliseconds from epoch. Accepts a string for parsing convenience. 0 for not paused.
     */
    public setPausedSince(pausedSince: string) {
        const parsedPausedSince = parseInt(pausedSince);
        if (!isNaN(parsedPausedSince)) {
            this.pausedSince = parsedPausedSince;
        } else {
            this.pausedSince = 0;
        }
    }

    /**
     * Is the user currently paused in the queue?
     *
     * @returns {boolean} - true for paused, false for not paused.
     */
    public isPaused() {
        return this.pausedSince > 0;
    }

    /**
     * Get the user object.
     *
     * @returns {User} - the user object.
     */
    public getUser(): User {
        return this.domain.users[this.userId];
    }

    /**
     * Get the queue object
     *
     * @returns {Queue} - the queue object.
     */
    public getQueue(): Queue {
        return this.domain.queues[this.queueId];
    }
}

/**
 * Class for objects representing a Queue.
 */
export class Queue extends CompassObject {

    /**
     * Name of the queue.
     */
    public name: string;

    /**
     * Array of queuemember objects, describing the Users in this Queue.
     *
     * @type {QueueMember[]}
     */
    public queueMembers: QueueMember[] = [];

    /**
     * Get all users that are logged in to this queue.
     *
     * @returns {User[]} - Array of users that are logged into this queue.
     */
    public getUsers(): User[] {
        return this.queueMembers.map((queueMember: QueueMember) => {
           return queueMember.getUser();
        }). filter((elem) => elem != null);
    }

    /**
     * Get all users that are logged into this queue, and are paused in this queue.
     *
     * @returns {User[]} - Array of users that are logged into this queue, and are paused in this queue.
     */
    public getPausedUsers(): User[] {
        return this.queueMembers.filter((queueMember: QueueMember) => {
           return ((this.domain.users[queueMember.userId] != null) && queueMember.isPaused());
        }).map((queueMember: QueueMember) => {
            return queueMember.getUser();
        });
    }

    /**
     * Is a specific user logged on to this queue?
     *
     * @param {string} userId - the userId of the user.
     * @returns {boolean} - true is userId is logged on to this queue, false otherwise.
     */
    public isUserInQueue(userId: string): boolean {
        return this.queueMembers.some((queueMember) => {
           return queueMember.userId === userId;
        });
    }

    /**
     * Is a specific user logged on to and paused in this queue?
     *
     * @param {string} userId - the userId of the user.
     * @returns {boolean} - true is userId is logged on to this queue and paused, false otherwise.
     */
    public isUserPausedInQueue(userId: string): boolean {
        return this.queueMembers.some((queueMember) => {
            return (queueMember.userId === userId) && (queueMember.isPaused());
        });
    }

    /**
     * Get the QueueMember structure for a user and this queue.
     *
     * @param {string} userId - the userId of the user.
     * @returns {QueueMember} - the QueueMember structure for a user and this queue.
     */
    public getQueueMember(userId: string): QueueMember {
        for (const queueMember of this.queueMembers) {
            if (queueMember.userId === userId) {
                return queueMember;
            }
        }
        return null;
    }

    /**
     * Get the calls in the queue.
     *
     * @returns {Call[]} - Array of calls that are in this queue. Empty array if currently no calls waiting in the queue.
     */
    public getCalls(): Call[] {
        const isQueueInCallpoint = (callPoint: CallPoint) => (callPoint instanceof QueueCallPoint && callPoint.queueId === this.id );
        return Object.values(this.domain.calls).filter(call => (isQueueInCallpoint(call.source) || isQueueInCallpoint(call.destination)));
    }
}

/**
 * The model, representing the state of a Company on the Compass platform.
 */
export class Model {
    /**
     * The compant that the model pertains to.
     */
    public company: Company;
    /**
     * All calls currently active in the company.
     */
    public calls: { [id: string]: Call };
    /**
     * All users in the company.
     */
    public users: { [id: string]: User };
    /**
     * All call-queues in the company.
     */
    public queues: { [id: string]: Queue };
    /**
     * An observable that triggers when a call-related event occurs.
     */
    public callsObservable: Observable<Event>;
    /**
     * An observable that triggers when a user-related event occurs.
     */
    public usersObservable: Observable<Event>;
    /**
     * An observable that triggers when a queue-related event occurs.
     */
    public queuesObservable: Observable<Event>;

    /**
     * Construct the Model object.
     *
     */
    constructor() {
        this.callsObservable = this.callsSubject.asObservable();
        this.usersObservable = this.usersSubject.asObservable();
        this.queuesObservable = this.queuesSubject.asObservable();
        this.calls = {};
        this.users = {};
        this.queues = {};
    }

    /**
     * Send an event with 'Invalidated' event-type on all three observables, called when connected or reconnected.
     */
    public notifyConnected() {
        this.usersSubject.next(new Event(null, EventType.Invalidated, null));
        this.queuesSubject.next(new Event(null, EventType.Invalidated, null));
        this.callsSubject.next(new Event(null, EventType.Invalidated, null));
    }


    /**
     * Get the user-object corresponding to the given jid.
     * @param jid - The jid of the user to retrieve.
     * @returns The user that has the given jid, or undefined if not found.
     */
    public getUserForJid(jid: string): User {
        return Object.values(this.users).find((u) => u.jid === jid);
    }

    /**
     * Send an event
     * @param e - the event to send.
     */
    public notify(e: Event) {
        if (e.emitter instanceof Queue) {
            this.queuesSubject.next(e);
        } else if (e.emitter instanceof Call) {
            this.callsSubject.next(e);
        } else if (e.emitter instanceof User) {
            this.usersSubject.next(e);
        } else {
            throw new Error("Invalid emitter: " + e.emitter);
        }
    }

    // privates

    private usersSubject: Subject<Event> = new Subject();
    private callsSubject: Subject<Event> = new Subject();
    private queuesSubject: Subject<Event> = new Subject();
}

/**
 * Get the duration from the given timestamps (in seconds).
 * @param startSec the start time; if not given, NaN is returned
 */
function getDurationFrom(startSec: number) {

    // if no start time, there is no duration
    if (!startSec) {
        return NaN;
    }
    
    const endSec = (new Date().getTime()) / 1000;
    return endSec - startSec;
}
