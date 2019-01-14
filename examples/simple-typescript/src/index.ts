import {Connection, Model} from 'compass.js';

function setText(txt: string) {
    const textElem = document.getElementById('main');
    textElem.innerHTML = txt;
}

declare const config: any;
if (typeof config === 'undefined') {
    setText("ERROR: No config.js file found!<br/>Create the file by copying config-example.js");
    throw new Error("Failed");
}

// Create the connection, and connect.
const conn = new Connection(config.basedom);
conn.connect(config.jid, config.password)
    .then(() => {
        const user = conn.model.getUserForJid(config.jid);
        setText(`We have connected, and all data has been retrieved.<br/>` +
            `Your user is named ${user.name}.`);
        window.console.log(conn.model.getUserForJid(config.jid));
        
    }).catch((e) => {
        setText(`Connection failed, see browser console.<br/>Reason: ${e}`);
        window.console.log(e);
    });
