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

async function main() {
    // Create the connection, and connect.
    const conn = new Compass.Connection(config.basedom);

    // For debugging:
    // Compass.compassLogger.setLevel(Compass.compassLogger.levels.DEBUG);
    // conn.logXmpp = true;

    await conn.connect(config.jid, config.password);

    // We are connected and all data-models have been retrieved.
    console.log("Connected!");

    // Get the api-version
    const version = await conn.rest.getApiVersion();
    console.log("Found API version", version);
      
    // Retrieve user
    const restUser = await conn.rest.getMyUser();
    console.log("Got REST user: ", restUser);

    // See the examples/simple example for more information on what to do once connected.

    conn.close();
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
