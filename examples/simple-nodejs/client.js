// Load required libraries and setup DOM-like environment
require('jsdom-global')();
require('strophe.js');
require("strophejs-plugin-pubsub");
require("rxjs");
global.WebSocket = require('ws');
global.DOMParser = window.DOMParser;
const Compass = require("compass.js");

// Load the config (copy from config-example.js and fill out your own credentials)
const config = require("./config.js");


// Create the connection, and connect.
const conn  = new Compass.Connection(config.basedom);

// For debugging:
// Compass.compassLogger.setLevel(Compass.compassLogger.levels.DEBUG);
// conn.logXmpp = true;

const promise = conn.connect(config.jid, config.password);

// We are connected and all data-models have been retrieved.
promise.then(function () {
    console.log("Connected!");
    process.exit(0);
});

promise.catch(function(e) {
    console.log(e);
    process.exit(1);
});

// See the examples/simple example for more information on what to do once connected.
