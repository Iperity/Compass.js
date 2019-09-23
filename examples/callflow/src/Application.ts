import {Call, Connection, Event, EventType, Model} from "compass.js";
import {CallGraph} from "./CallGraph";
import * as $ from 'jquery';
import './styles/app.css';

export class Application {

    private config: any;
    private conn: Connection;
    private model: Model;
    private calls: { [key: string] : CallGraph } = {};
    private haveFirstCall: boolean = false;

    constructor(config: any) {
        this.config = config;
    }

    public run() {
        this.conn = new Connection(this.config.basedom);
        this.model = this.conn.model;
        this.conn.connect(this.config.jid, this.config.password)
            .then(() => {
                $('#loading').hide();
                $('#initialText').show();
                this.model.callsObservable.subscribe((ev) => this.handleCallEvent(ev, ev.emitter as Call));
            })
            .catch((e) => {
                alert(`Connection failed, see browser console.\nReason: ${e}`);
            });
    }

    private handleCallEvent(ev: Event, call: Call) {
        if (call === null) {
            // reconnect
            // TODO!
        }

        if (!this.haveFirstCall) {
            this.haveFirstCall = true;
            $('#initialText').hide();
        }

        let callGraph: CallGraph = null;
        if (ev.eventType === EventType.Added) {
            callGraph = new CallGraph(call);
            callGraph.startCall();

            this.calls[ev.emitter.id] = callGraph;
            if (call.parentCall) {
                this.calls[call.parentCall.id].getDiv()
                    .append(callGraph.getDiv());
            } else {
                $('body').append(callGraph.getDiv());
            }
        } else if (call.id in this.calls) {
            callGraph = this.calls[call.id];
        } else {
            // ignore.
            return;
        }

        callGraph.handle(ev);
    }
}
