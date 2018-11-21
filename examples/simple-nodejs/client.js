// Get a jQuery with a simulated 'window' object, and get jQuery in the global namespace.
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = (new JSDOM());
const $ = require('jquery')(window);
require('jsdom-global')();
global.$ = $;

// Load required libraries
require('strophe.js');
require("strophejs-plugin-pubsub");
const rxjs = require("rxjs");
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
});

// See the examples/simple example for more information on what to do once connected.