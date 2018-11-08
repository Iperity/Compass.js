import {CompassObject} from "./Model";

/**
 * Type of events.
 */
export enum EventType {

    // The emitter is newly added
    Added         = "Added",
    // The emitter is removed
    Removed       = "Removed",
    // The emitter has changed
    Changed         = "Changed",

    // The emitter is associated with the call (passed in data).
    CallAdded       = "CallAdded" ,
    // The emitter is no longer associated with the call (passed in data).
    CallRemoved     = "CallRemoved",

    // The emitter is associated with the queue (passed in data).
    QueueAdded      = "QueueAdded",
    // The emitter is no longer associated with the queue (passed in data).
    QueueRemoved    = "QueueRemoved",

    // The emitter is associated with the user (passed in data).
    UserAdded       = "UserAdded",
    // The emitter is no longer associated with the user (passed in data).
    UserRemoved     = "UserRemoved",

    // The user is paused in a queue. This is emitted on both the user and the queue object.
    Paused          = "Paused",
    // The user is unpaused in a queue. This is emitted on both the user and the queue object.
    Unpaused        = "Unpaused",

    // A property of the emitter has changed.
    PropertyChanged = "PropertyChanged",

    // The list of objects has been changed. Reset state and retrieve the objects again. This is fired on connect and after a reconnect.
    Invalidated = "Invalidated",
}

export default class Event {
    public emitter: CompassObject;
    public eventType: EventType;
    public data: any;

    constructor(emitter: CompassObject, eventType: EventType, data: any = null) {
        this.emitter = emitter;
        this.eventType = eventType;
        this.data = data;
    }
}
