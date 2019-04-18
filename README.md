Compass Javascript Library
=============

Overview
---------

The Compass JavaScript Library (Compass.js) is a JavaScript library that can be used to connect to, retrieve data from and retrieve notifications from the XMPP API on the IPerity Compass telephony platform.
The library is designed to run as local JavaScript in a client's web-browser.

After connecting, the library maintains a local data model that's automatically and constantly kept up to date with the server. Clients can explore the data model and subscribe for changes.


Requirements
---------

The library depends on a number of other JavaScript libraries to run:

* JQuery >= 3.3.1       (http://jquery.com/download/)
* Strophe.js >= 1.2.16  (http://strophe.im/strophejs/)
* Strophe pubsub plugin (https://github.com/ggozad/strophe.plugins)
* RxJS >= 6.3.2         (https://github.com/ReactiveX/rxjs)


Quickstart
---------

Install Compass.js through npm
* run `npm install compass.js` 

Create a project:
* Create a `.html` page including all required JavaScript in separate `<script>` tags.
* Include Compass.js as well. When downloading CompassJS through npm, this can be done with the following `<script>` tag:
```
<script src="node_modules/compass.js/build/Compass.js"></script>
```


In javaScript:

* Create the 'connection' object
```javascript
const conn  = new compass.Connection("compass-basedomain.com");
```
* Connect
```javascript
const connectionPromise = conn.connect("jid", "password");
```
* Set a callback to trigger when the model is fully retrieved.
```javascript
connectionPromise.then(function(){});
```

After the `connectPromise` has triggered, the model is available and guaranteed to be complete on `conn.model`.

A full example of how to connect, retrieve the model and listen for events is demonstrated by the *simple* client in the *examples/simple* directory. It is recommended to use this example code as a starting point.

Model
---------

All users, queues, and calls within the company are available on the `conn.model.users`, `conn.model.queues` and `conn.model.calls` objects respectively. All objects are accessible by their id.

Moreover, events for these objects are published on the `conn.model.usersObservable`, `conn.model.queuesObservable` and `conn.model.callsObservable` RxJS observables. 
These observables emit a stream of events of type *compass.Event*.

The *compass.Event* object has the following properties:
* emitter - Which *Queue*, *Call*, or *Company* emitted this event. Can be *null* for global events.
* eventType - What was the event type for this event?
* data - Additional data for the event.

For a description of event types, see the [Events.ts file in the repository](./src/Events.ts). 

For example: when a user logs into a queue, we will receive an event on the *conn.model.queueObservable* with the following properties:
* emitter - The queue that the user logged on to.
* eventType - *compass.EventType.UserAdded* - because a user got added to a queue.
* data - The user that logged on to the queue.

As an example, we could log queue-events as following:
```javascript
    conn.model.queuesObservable.subscribe(event => {
        console.log(`Queue ${event.emitter.name} (${event.emitter.id}) event: ${event.eventType}`);
    });
```

### RxJS

We use [*RxJS*](https://github.com/ReactiveX/rxjs) observables. *RxJS* can be used to modify the stream of events in many ways. 
For example, events can be filtered to only include events of a certain type:
```javascript
    const {filter} = rxjs.operators;

    conn.model.queuesObservable.pipe(filter((event) => event.eventType === Compass.EventType.UserAdded)).subscribe(event => {
        console.log(`User ${event.data.name} logged into queue ${event.emitter.name}`);
    });
``` 
Read the RxJS website or [one](http://reactivex.io/rxjs/manual/tutorial.html) of the many [tutorials](https://www.learnrxjs.io/) for more examples and recipes.
    

### Reconnect

The library automatically tries to reconnect if the connection to the server if lost.
If this happens, the model is rebuild from scratch. 

When the model is complete, the library notifies the client by sending an event with event type `Compass.EventType.Invalidated` on the `usersObservable`, `queuesObservable` and the `callsObservable` observables.
The client must assume that any events received before this event are now invalid, and should rebuild internal state, gui, etc. from the `conn.model`.
This event is also emitted on initial connection.   


Logging
---------

By default, only `warn` level and higher log messages are logged to the JavaScript console. 
The log-level van be changed to log level `debug` as following: 
```javascript
compass.compassLogger.setLevel(compass.compassLogger.levels.DEBUG);
```

After the log-level has been set to debug, all XMPP traffic can be logged as following:
```javascript
conn.logXmpp = true;
```

We use the [*loglevel*](https://github.com/pimterry/loglevel) logging library. The loglevel root logger is available on `Compass.rootLogger`. 
Visit their website for more recipes and instructions regarding the use of their logging library.  


Building
---------
To build the library:
* run `npm install`
* run `npm run-script build`

Publishing
---------
* If not done so already: Increase version-number in package.json
* `git tag <version-number>`
* `git push origin <version-number>`
* create a release from this tag on github.
* `npm run-script build`
* `npm test`
* `npm publish`

If you haven't logged on to the npm cli yet, it will prompt you to do so when running the last step.

 
Documentation & Examples
---------

* See the *examples/* directory for examples.
* Extensive XMPP API documentation can be read in the *Developer Manual*, which is found in your Compass webinterface.
