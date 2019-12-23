import {
    Call,
    CallPoint,
    CallPointState,
    CallPointType,
    Event,
    EventType,
    ExternalCallPoint,
    QueueCallPoint,
    UserCallPoint,
    ListenInCallPoint,
} from "compass.js";
import * as $ from 'jquery';

/**
 * Renders the call flow of a single call inside a div.
 */
export class CallGraph {

    private call: Call;
    private div: JQuery;
    private lastSource: string;
    private lastSourceState: CallPointState;
    private lastDestination: string;
    private lastDestinationState: CallPointState;

    constructor(call: Call) {
        this.call = call;
        this.handleStart();
    }

    startCall() {
        this.handleStart();
    }

    getDiv() {
        return this.div;
    }

    handle(ev: Event) {
        switch(ev.eventType) {
            case EventType.Changed:
                this.handleChange(ev);
                break;
            case EventType.Removed:
                this.handleEnd(ev);
                break;
        }
    }

    private handleStart() {
        this.div = $("<div class='call'></div>");

        const closeBtn = $(`<img class='closeBtn' src="img/close.png" />`);
        closeBtn.on('click', () => {
            this.div.hide();
        });
        this.div.append(closeBtn);

        const callId = $('<div/>');
        callId.addClass('callId').text('CallID: ' + this.call.id);
        this.div.append(callId);

        this.addStep(this.createUpdate(this.call));
        this.setLast();
    }

    private handleChange(ev: Event) {
        if (ev.data.updateType === 'state') {
            // deprecated state change
            return;
        }
        this.addStep(this.createUpdate(this.call));
        this.setLast();
    }

    private handleEnd(ev: Event) {
        const div = $("<div class='end'></div>");
        div.text('Ended, reason = ' + ev.data.reason);
        this.addStep(div);
        this.div.addClass('hungup');
    }

    private setLast() {
        this.lastSource = this.callpointToString(this.call.source);
        this.lastDestination = this.callpointToString(this.call.destination);
        this.lastSourceState = this.call.source.state;
        this.lastDestinationState = this.call.destination.state;
    }

    private createUpdate(call: Call) {
        const div = $("<div><div class='source'></div><div class='dest'></div></div>");
        div.find('.source').html(this.callpointDiff(call.source, this.lastSource, this.lastSourceState));
        div.find('.dest').html(this.callpointDiff(call.destination, this.lastDestination, this.lastDestinationState));
        return div;
    }

    private callpointDiff(cp: CallPoint, oldDesc: string, oldState: string): string {
        const newDesc = this.callpointToString(cp);

        let endpointChanged = newDesc != oldDesc;
        let stateChanged = cp.state != oldState;
        if (endpointChanged) {
            return `${newDesc} ${cp.state}`;
        } else if (stateChanged) {
            return `${this.grey(newDesc)} ${cp.state}`;
        } else {
            return `${this.grey(newDesc)} ${this.grey(cp.state)}`;
        }
    }

    private grey(str: string) {
        return `<span class='grey'>${str}</span>`;
    }

    private callpointToString(cp: CallPoint) {
        let desc = null;
        switch(cp.type) {
            case CallPointType.queue:
                const queue = (cp as QueueCallPoint).getQueue();
                desc = queue.id + '=' + queue.name;
                break;
            case CallPointType.external:
                desc = (cp as ExternalCallPoint).number;
                break;
            case CallPointType.user:
                let user = (cp as UserCallPoint).getUser();
                desc = user.id + '=' + user.name;
                break;
            case CallPointType.listenIn:
                const listenedToCallId = (cp as ListenInCallPoint).getListenedToCall().id;
                desc = "Listening to: " + listenedToCallId;
                break;
        }

        return desc ?
            cp.type + '(' + desc + ')' : cp.type;
    }

    private addStep(contents: JQuery) {
        const div = $("<div class='step'></div>");
        div.append(contents);
        this.div.append(div);
    }

}
