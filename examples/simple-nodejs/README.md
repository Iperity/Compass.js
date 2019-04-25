Compass Javascript Library - Simple NodeJS Example
=============

Overview
---------

a demonstration of how to connect to Compass and receive events using a Node.js script; no user interface.

Requirements
------------
The Compass library makes use of at least ES2017. The mimimum version of NodeJS that [supports](https://stackoverflow.com/a/40421941/1294864)
this is `7.0`. Version `6.8.1` also supports it, but is considered unstable and is locked behind
the `--harmony` flag.

Usage
---------
- Switch to the `examples/simple-nodejs` directory.
- Run `npm install`
- Copy config-example.js to config.js and change config.js to fill out your own credentials.
- Run `node client.js`
