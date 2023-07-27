if (typeof config === 'undefined') {
    let elem = document.getElementById('main');
    elem.innerHTML = "ERROR: No config.js file found!<br/>Create the file by copying config-example.js";
}

// Create the connection, and connect.
const conn  = new compass.Connection(config.basedom);

// For debugging:
// compass.compassLogger.setLevel(compass.compassLogger.levels.DEBUG);
// conn.logXmpp = true;

const promise = conn.connect(config.jid, config.password);

// We are connected and all data-models have been retrieved.
promise.then(function () {
    console.log("We have connected, and all data has been retrieved.");

    console.log("Got the following users:");
    display(conn.model.users);

    console.log("Got the following queues:");
    display(conn.model.queues);

    console.log("Got the following calls:");
    display(conn.model.calls);

    // Listen to the userList
    conn.model.usersObservable.subscribe(event => {
        if (!event.emitter) return; // reconnect events

        console.log(`User ${event.emitter.name} (${event.emitter.id}) event: ${event.eventType}`);
        if (event.eventType === compass.EventType.PropertyChanged) {
            logPropertyChanged(event);
        } else if (event.eventType === compass.EventType.Changed) {
            console.log(event.data);
        }
    });

    // Listen to the queue-list
    conn.model.queuesObservable.subscribe(event => {
        if (!event.emitter) return; // reconnect events

        console.log(`Queue ${event.emitter.name} (${event.emitter.id}) event: ${event.eventType}`);
        if (event.eventType === compass.EventType.PropertyChanged) {
            logPropertyChanged(event);
        }
    });

    // Listen to the call-list
    conn.model.callsObservable.subscribe(event => {
        if (!event.emitter) return; // reconnect events

        console.log(`Call ${event.emitter.id} event: ${event.eventType}`);
        switch (event.eventType) {
            case compass.EventType.Changed:
                let details = '';
                switch (event.data.updateType) {
                    case 'source':
                        details = 'source changed to ' + event.emitter.source;
                        break;
                    case 'destination':
                        details = 'destination changed to ' + event.emitter.destination;
                        break;
                    case 'state':
                        details = 'state changed to ' + event.emitter.state;
                        break;
                    case 'stepResult':
                        const rp = event.data.callpoint;
                        details = 'choice "' + rp.name + '" result ' + event.data.result;
                        break;
                    case 'queueExit':
                        details = `queue exited with reason ${event.data.queueExit}`;
                        break;
                    default:
                        details = event.data.updateType;
                        break;
                }
                console.log(`... ${details}`);
                break;
            case compass.EventType.PropertyChanged:
                logPropertyChanged(event);
                break;
        }
    });

    console.log("Waiting for changes.");
}, function(e) {
    console.log("Login failed: ", e);
});


/*
 * console.log the object
 */
function display(map) {
    for (const [key, obj] of Object.entries(map)) {
        console.log(obj);
    }
}

function logPropertyChanged(event) {
    console.log(`... ${event.data.name} from '${event.data.oldValue}' to '${event.data.newValue}'`);
}
