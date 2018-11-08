import Model, {
    CallPointState,
    CallPointType,
    ExternalCallPoint,
    UserCallPoint,
    DialplanCallPoint, Call, Queue, QueueCallPoint, CallState, CallEndReason,
} from "../src/Model";
import XmppHandler from "../src/XmppHandler";
import Event, { EventType } from "../src/Events";
import { expect } from 'chai';
import {Observable} from "rxjs";

// Setup jQuery for tests.

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = (new JSDOM());
const globalAny: any = global;
const $ = globalAny.$ = globalAny.jQuery = require('jquery')(window);

// Simple event-collection class
class EventRecorder {

    private events: Event[] = [];
    private idx: number = 0;

    constructor(observable: Observable<Event>) {
        observable.subscribe((e) => this.add(e));
    }

    private add(e: Event) {
        this.events.push(e);
    }

    public get(i: number): Event {
        return this.events[i];
    }

    public next(): Event {
        return this.events[this.idx++];
    }

    public size() {
        return this.events.length;
    }

    public clear() {
        this.idx = 0;
        this.events = [];
    }
}

function getEmptyModel() {
    return new Model();
}

function getEmptyXmppHandler() {
    const model = getEmptyModel();
    return new XmppHandler(model);
}

// XML snippets
const xmlQueueString =
    "<queue id=\"2\" xmlns=\"http://iperity.com/compass\">\n" +
    "\t<name>queue1</name>\n" +
    "\t<userEntries>\n" +
    "\t\t<entry>\n" +
    "\t\t\t<queueId>2</queueId>\n" +
    "\t\t\t<userId>883</userId>\n" +
    "\t\t\t<priority>10</priority>\n" +
    "\t\t</entry>\t\n" +
    "\t</userEntries>\n" +
    "\t<callIds>\n" +
    "\t\t<id>1</id>\n" +
    "\t</callIds>\n" +
    "</queue>";
const xmlCreateQueueNotification = $.parseXML(
    "<notification\n" +
    "\txmlns=\"http://iperity.com/compass\"\n" +
    "\txmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:type=\"queueCreateNotification\"\n" +
    "\ttype=\"notification.queue.create\" timestamp=\"1234\">\n" +
    xmlQueueString +
    "</notification>");
const xmlGetCompanyResult = $.parseXML(
    "<result xmlns=\"http://iperity.com/compass\" xmlns:xsi=\"http://www.w3.org\n" +
    "          /2001/XMLSchema-instance\" xsi:type=\"getCompanyResult\">" +
    "   <id>company1id</id>" +
    "   <name>company1name</name>" +
    "</result>",
);
const xmlGetUsersResult = $.parseXML(
    '<result xmlns="http://iperity.com/compass" xmlns:xsi="http://www.w3.org\n' +
    '          /2001/XMLSchema-instance" xsi:type="getResult">\n' +
    '         <user id="8323556">\n' +
    '            <identifiers>\n' +
    '               <lisaId>8323556</lisaId>\n' +
    '               <xmppJid>testuser@uc.vtel.compasspreview.com</xmppJid>\n' +
    '               <compassId>test</compassId>\n' +
    '            </identifiers>\n' +
    '            <name>Test User</name>\n' +
    '            <loggedIn>true</loggedIn>\n' +
    '            <location>1442646</location>\n' +
    '            <language>nl</language>\n' +
    '            <contact>test@iperity.com</contact>\n' +
    '            <extensions>200</extensions>\n' +
    '         </user>\n' +
    '      </result>',
);
const xmlCreateUserNotification = $.parseXML(
    '<notification xmlns="http://iperity.com/compass" xmlns:xsi="' +
    '                   http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '                   ="1492705754" type="notification.user.create" xsi:type="' +
    '                   createUserNotification">\n' +
    '                   <userId>8323556</userId>' +
    '                   <user id="8323556">\n' +
    '                        <identifiers>\n' +
    '                           <lisaId>8323556</lisaId>\n' +
    '                           <xmppJid>testuser@uc.vtel.compasspreview.com</xmppJid>\n' +
    '                           <compassId>test</compassId>\n' +
    '                        </identifiers>\n' +
    '                        <name>Test User</name>\n' +
    '                        <loggedIn>true</loggedIn>\n' +
    '                        <location>1442646</location>\n' +
    '                        <language>nl</language>\n' +
    '                        <contact>test@iperity.com</contact>\n' +
    '                        <extensions>200</extensions>\n' +
    '                    </user>\n' +
    '</notification>',
);
const xmlUpdateUserNotification = $.parseXML(
    '<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '                   http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '                   ="1492705754" type="notification.user.update" xsi:type="\n' +
    '                   updateUserNotification">\n' +
    '                  <userId>8323556</userId>\n' +
    '                  <propertyChange>\n' +
    '                    <name>name</name>\n' +
    '                    <oldValue>Test User</oldValue>\n' +
    '                    <newValue>Tijs Testuser</newValue>\n' +
    '                  </propertyChange>\n' +
    '</notification>',
);
const xmlDestroyUserNotification = $.parseXML(
    '<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '                   http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '                   ="1492705754" type="notification.user.destroy" xsi:type="\n' +
    '                   destroyUserNotification">\n' +
    '                  <userId>8323556</userId>\n' +
    '</notification>',
);
const xmlGetCallsResult = $.parseXML(
    '<result xmlns="http://iperity.com/compass" xmlns:xsi="http://www.w3.org\n' +
    '          /2001/XMLSchema-instance" xsi:type="getResult">\n' +
    '        <call id="528656818dd9-8q6jztb2102.11c5aaa0e6.0/">\n' +
    '         <source id="192" type="User" xsi:type="callpointUser">\n' +
    '             <timeCreated>1384535809</timeCreated>\n' +
    '             <properties/>\n' +
    '             <userId>8323556</userId>\n' +
    '             <userName>Test User</userName>\n' +
    '             <id>73</id>\n' +
    '             <state>CONNECTING</state>\n' +
    '         </source>\n' +
    '         <destination id="194" type="User" xsi:type="callpointUser">\n' +
    '             <timeCreated>1384535809</timeCreated>\n' +
    '             <properties/>\n' +
    '             <userId>16</userId>\n' +
    '             <userName>Alex Groot</userName>\n' +
    '             <id>74</id>\n' +
    '             <state>RINGING</state>\n' +
    '         </destination>\n' +
    '         <state>RINGING</state>' +
    '    </call>\n' +
    '</result>',
    );
const xmlCallStartNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.call.start" xsi:type="\n' +
    '       callStartNotification">\n' +
    '      <call id="IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0">\n' +
    '         <source id="8093725" type="External" xsi:type="\n' +
    '             callpointExternal">\n' +
    '            <timeCreated>1492705754</timeCreated>\n' +
    '            <properties />\n' +
    '            <number>31614241111</number>\n' +
    '            <name>31614241111</name>\n' +
    '            <state>CONNECTING</state>\n' +
    '         </source>\n' +
    '         <destination id="8093726" type="Dialplan" xsi:type="\n' +
    '             callpointDialplan">\n' +
    '            <timeCreated>1492705754</timeCreated>\n' +
    '            <properties />\n' +
    '            <state>CONNECTING</state>\n' +
    '            <exten>31413231111</exten>\n' +
    '            <description>dialler</description>\n' +
    '         </destination>\n' +
    '      <state>CONNECTING</state>\n' +
    '      <properties />\n' +
    '   </call>\n' +
    '</notification>',
);
const xmlCallUpdateSourceNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.call.update" xsi:type="\n' +
    '       callUpdateNotification">\n' +
    '      <callId>IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0</callId>\n' +
    '      <updateType>SOURCE</updateType>\n' +
    '      <call id="IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0">\n' +
    '         <source id="8093725" type="User" xsi:type="\n' +
    '             callpointUser">\n' +
    '            <timeCreated>1492705754</timeCreated>\n' +
    '            <properties />\n' +
    '            <number>200</number>\n' +
    '            <userId>8323556</userId>\n' +
    '            <state>CONNECTING</state>\n' +
    '         </source>\n' +
    '         <destination id="8093726" type="Dialplan" xsi:type="\n' +
    '             callpointDialplan">\n' +
    '            <timeCreated>1492705754</timeCreated>\n' +
    '            <properties />\n' +
    '            <exten>31413231111</exten>\n' +
    '            <state>CONNECTING</state>\n' +
    '      </destination>\n' +
    '      <state>CONNECTING</state>\n' +
    '      <properties />\n' +
    '   </call>\n' +
    '</notification>',
);
const xmlCallUpdateDestinationNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.call.update" xsi:type="\n' +
    '       callUpdateNotification">\n' +
    '      <callId>IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0</callId>\n' +
    '      <updateType>DESTINATION</updateType>\n' +
    '      <call id="IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0">\n' +
    '         <source id="8093725" type="External" xsi:type="\n' +
    '             callpointExternal">\n' +
    '            <timeCreated>1492705754</timeCreated>\n' +
    '            <properties />\n' +
    '            <number>31614241111</number>\n' +
    '            <name>31614241111</name>\n' +
    '            <state>CONNECTING</state>\n' +
    '         </source>\n' +
    '         <destination id="8093725" type="User" xsi:type="\n' +
    '             callpointUser">\n' +
    '            <timeCreated>1492705754</timeCreated>\n' +
    '            <properties />\n' +
    '            <number>200</number>\n' +
    '            <userId>8323556</userId>\n' +
    '            <state>CONNECTING</state>\n' +
    '         </destination>\n' +
    '      <state>CONNECTING</state>\n' +
    '      <properties />\n' +
    '   </call>\n' +
    '</notification>',
);
const xmlCallUpdateDestinationQueueNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.call.update" xsi:type="\n' +
    '       callUpdateNotification">\n' +
    '      <callId>IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0</callId>\n' +
    '      <updateType>DESTINATION</updateType>\n' +
    '      <call id="IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0">\n' +
    '         <source id="8093725" type="External" xsi:type="\n' +
    '             callpointExternal">\n' +
    '            <timeCreated>1492705754</timeCreated>\n' +
    '            <properties />\n' +
    '            <number>31614241111</number>\n' +
    '            <name>31614241111</name>\n' +
    '            <state>CONNECTING</state>\n' +
    '         </source>\n' +
    '         <destination id="8093725" type="Queue" xsi:type="\n' +
    '             callpointQueue">\n' +
    '            <timeCreated>1492705754</timeCreated>\n' +
    '            <properties />\n' +
    '            <queueId>2</queueId>\n' +
    '            <state>CONNECTING</state>\n' +
    '         </destination>\n' +
    '      <state>CONNECTING</state>\n' +
    '      <properties />\n' +
    '   </call>\n' +
    '</notification>',
);
const xmlCallUpdateStateNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.call.update" xsi:type="\n' +
    '       callUpdateNotification">\n' +
    '      <callId>IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0</callId>\n' +
    '      <updateType>STATE</updateType>\n' +
    '      <call id="IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0">\n' +
    '         <source id="8093725" type="External" xsi:type="\n' +
    '             callpointExternal">\n' +
    '            <timeCreated>1492705754</timeCreated>\n' +
    '            <properties />\n' +
    '            <number>31614241111</number>\n' +
    '            <name>31614241111</name>\n' +
    '            <state>CONNECTING</state>\n' +
    '         </source>\n' +
    '         <destination id="8093725" type="Queue" xsi:type="\n' +
    '             callpointQueue">\n' +
    '            <timeCreated>1492705754</timeCreated>\n' +
    '            <properties />\n' +
    '            <queueId>2</queueId>\n' +
    '            <state>RINGING</state>\n' +
    '         </destination>\n' +
    '      <state>RINGING</state>\n' +
    '      <properties />\n' +
    '   </call>\n' +
    '</notification>',
);
const xmlCallEndNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.call.end" xsi:type="\n' +
    '       callEndNotification">\n' +
    '      <callId>IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0</callId>' +
    '      <endReason>DESTINATION_HANGUP</endReason>' +
    '</notification>',
);
const xmlGetQueuesResult = $.parseXML('<result xmlns="http://iperity.com/compass" xmlns:xsi="http://www.w3.org\n' +
    '          /2001/XMLSchema-instance" xsi:type="getResult">\n' +
    '         <queue id="1442896">\n' +
    '            <name>My Queue</name>\n' +
    '            <userEntries>\n' +
    '               <entry>\n' +
    '                  <queueId>1442896</queueId>\n' +
    '                  <userId>8323556</userId>\n' +
    '                  <priority>10</priority>\n' +
    '               </entry>\n' +
    '            </userEntries>\n' +
    '            <callIds />\n' +
    '            <averageWait>0</averageWait>\n' +
    '            <totalWait>188</totalWait>\n' +
    '            <maxWait>0</maxWait>\n' +
    '            <totalCalls>21</totalCalls>\n' +
    '            <handledCalls>14</handledCalls>\n' +
    '         </queue>\n' +
    '      </result>');
const xmlQueueCallEnterNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.queue.call.enter" xsi:type="\n' +
    '       queueCallEnterNotification">\n' +
    '       <queueId>1442896</queueId>' +
    '       <queueCall>\n' +
    '             <callId>IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0</callId>\n' +
    '       </queueCall> \n' +
    '</notification>',
);
const xmlQueueCallLeaveNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.queue.call.leave" xsi:type="\n' +
    '       queueCallLeaveNotification">\n' +
    '       <queueId>1442896</queueId>' +
    '       <queueCall>\n' +
    '             <callId>IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0</callId>\n' +
    '       </queueCall> \n' +
    '</notification>',
);
const xmlQueueUpdateNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.queue.update" xsi:type="\n' +
    '       queueUpdateNotification">\n' +
    '       <queueId>1442896</queueId>' +
    '       <propertyChange>' +
    '           <name>name</name>' +
    '           <oldValue>My Queue</oldValue>' +
    '           <newValue>Her Queue</newValue>' +
    '       </propertyChange>' +
    '</notification>',
);
const xmlQueueDestroyNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.queue.destroy" xsi:type="\n' +
    '       queueDestroyNotification">\n' +
    '       <queueId>2</queueId>' +
    '</notification>',
);
const xmlQueueMemberLeaveNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.queueMember.leave" xsi:type="\n' +
    '       queueMemberLeaveNotification">\n' +
    '       <member>' +
    '           <queueId>1442896</queueId>' +
    '           <userId>8323556</userId>' +
    '           <priority>1</priority>' +
    '       </member>' +
    '</notification>',
);
const xmlQueueMemberEnterNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.queueMember.enter" xsi:type="\n' +
    '       queueMemberEnterNotification">\n' +
    '       <member>' +
    '           <queueId>1442896</queueId>' +
    '           <userId>8323556</userId>' +
    '           <priority>1</priority>' +
    '       </member>' +
    '</notification>',
);
const xmlQueueMemberPauseNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.queueMember.update" xsi:type="\n' +
    '       queueMemberEnterNotification">\n' +
    '       <member>' +
    '           <queueId>1442896</queueId>' +
    '           <userId>8323556</userId>' +
    '           <priority>1</priority>' +
    '           <pausedSince>1337295600000</pausedSince>' +
    '       </member>' +
    '</notification>',
);
const xmlQueueMemberUnpauseNotification = $.parseXML('<notification xmlns="http://iperity.com/compass" xmlns:xsi="\n' +
    '       http://www.w3.org/2001/XMLSchema-instance" timestamp\n' +
    '       ="1492705754" type="notification.queueMember.update" xsi:type="\n' +
    '       queueMemberEnterNotification">\n' +
    '       <member>' +
    '           <queueId>1442896</queueId>' +
    '           <userId>8323556</userId>' +
    '           <priority>1</priority>' +
    '           <pausedSince>0</pausedSince>' +
    '       </member>' +
    '</notification>',
);

// Tests

describe('XmppHandler :: Company', () => {
    it('getCompany', () => {
        const xmlCompany = $(xmlGetCompanyResult).find('>result');

        const xmppHandler = getEmptyXmppHandler();
        xmppHandler.setCompanyFromXmpp(xmlCompany);
        expect(xmppHandler.model.company.id).equals("company1id");
        expect(xmppHandler.model.company.name).equals("company1name");
    });
});

describe('XmppHandler :: User', () => {
    it('getUsers', () => {

        const xmlUsers = $(xmlGetUsersResult).find('>result').children();

        const xmppHandler = getEmptyXmppHandler();
        const model = xmppHandler.model;

        xmppHandler.setUsersFromXmpp(xmlUsers);
        const modelUser = model.users["8323556"];
        expect(modelUser).to.not.be.undefined;
        expect(modelUser.name).equals('Test User');
        expect(modelUser.phoneId).equals(1442646);
    });

    it('removeUser', () => {
        const xmppHandler = getEmptyXmppHandler();
        const model = xmppHandler.model;

        // Create user
        const xmlNotification = $(xmlCreateUserNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        const userId = '8323556';
        const user = model.users[userId];
        expect(user.name).equals('Test User');

        // Listen for event
        let eventReceived = false;
        model.usersObservable.subscribe((e) => {
            eventReceived = true;
            expect(e.eventType).equals(EventType.Removed);
            expect(e.emitter).equals(user);
        });

        // Remove user
        xmppHandler.removeUser(userId);

        // Check
        expect(model.users[userId]).to.be.undefined;
        expect(eventReceived).equals(true);
    });

    it('notification.user.create', () => {
        const xmlNotification = $(xmlCreateUserNotification).children();

        const xmppHandler = getEmptyXmppHandler();
        const model = xmppHandler.model;
        let eventReceived = false;
        model.usersObservable.subscribe(() => {
            eventReceived = true;
        });
        xmppHandler.handleNotification(xmlNotification);


        expect(eventReceived).equals(true);
        expect(model.users["8323556"]).to.not.be.undefined;
        expect(model.users["8323556"].name).equals('Test User');
    });

    it('notification.user.update', () => {
        const xmppHandler = getEmptyXmppHandler();
        const model = xmppHandler.model;

        // Create user
        const xmlNotification = $(xmlCreateUserNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        const userId = '8323556';

        // Listen for event
        let eventReceived = false;
        model.usersObservable.subscribe((e) => {
            eventReceived = true;
            expect(e.eventType).equals(EventType.PropertyChanged);
            expect(e.emitter).equals(model.users[userId]);
            expect(e.data.name).equals("name");
        });

        // Update user
        xmppHandler.handleNotification($(xmlUpdateUserNotification).children());
        // Check
        expect(eventReceived).equals(true);
        expect(model.users["8323556"].name).equals('Tijs Testuser');
    });

    it('notification.user.destroy', () => {
        const xmppHandler = getEmptyXmppHandler();
        const model = xmppHandler.model;

        // Create user
        const xmlNotification = $(xmlCreateUserNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        const userId = '8323556';
        const user = model.users[userId];
        expect(user.name).equals('Test User');

        // Listen for event
        let eventReceived = false;
        model.usersObservable.subscribe((e) => {
            eventReceived = true;
            expect(e.eventType).equals(EventType.Removed);
            expect(e.emitter).equals(user);
        });

        // handle user removed notification
        xmppHandler.handleNotification($(xmlDestroyUserNotification).children());

        // Check
        expect(model.users[userId]).to.be.undefined;
        expect(eventReceived).equals(true);
    });
});

describe('XmppHandler :: Call', () => {
    // For these tests, we will share state between tests.
    const callId1 = '528656818dd9-8q6jztb2102.11c5aaa0e6.0/';
    const callId2 = 'IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0';
    const userId = '8323556';

    const xmppHandler = getEmptyXmppHandler();
    const model = xmppHandler.model;

    // add data
    xmppHandler.handleNotification($(xmlCreateQueueNotification).children());
    xmppHandler.handleNotification($(xmlCreateUserNotification).children());
    const user = model.users[userId];

    let newCall: Call;

    // subscriptions (these could be re-used by all tests)
    const callEvents = new EventRecorder(model.callsObservable);
    const queueEvents = new EventRecorder(model.queuesObservable);
    const userEvents = new EventRecorder(model.usersObservable);

    beforeEach(function() {
        callEvents.clear();
        userEvents.clear();
        queueEvents.clear();
    });

    it('getCalls', () => {

        // process getCalls response.
        const xmlCalls = $(xmlGetCallsResult).find('>result').children();
        xmppHandler.setCallsFromXmpp(xmlCalls);

        expect(model.calls[callId1]).to.not.be.undefined;
        expect(model.calls[callId1].state).equals(CallState.ringing);
    });

    it('notification.call.create', () => {
        // Add a call through notification.call.start
        let eventReceived = false;
        const subscription = model.callsObservable.subscribe(() => {
            eventReceived = true;
        });

        const xmlNotification = $(xmlCallStartNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        subscription.unsubscribe();

        expect(model.calls[callId2]).to.not.be.undefined;
        newCall = model.calls[callId2];

        // test parsing of ExternalCallpoint
        const source = newCall.source as ExternalCallPoint;
        expect(source.type).equals(CallPointType.external);
        expect(source.timeCreated).equals(1492705754);
        expect(source.timeStarted).to.be.null;
        expect(source.number).equals('31614241111');
        expect(source.name).equals('31614241111');
        expect(source.state).equals(CallPointState.connecting);

        // test parsing of DialplanCallpoint
        const dest = newCall.destination as DialplanCallPoint;
        expect(dest.type).equals(CallPointType.dialplan);
        expect(dest.exten).equals('31413231111');
        expect(dest.description).equals('dialler');
    });

    it('notification.call.update (source = user)', () => {

        // Call-event checks
        let callEventReceived = false;
        const subscription1 = model.callsObservable.subscribe((e) => {
            if (callEventReceived == false) {
                callEventReceived = true;
                // console.log(arguments);
                expect(e.emitter).equals(newCall);
                expect(e.eventType).equals(EventType.UserAdded);
                expect(e.data.user.id).equals(user.id);
            }
        });

        // User-event checks
        let userEventReceived = false;
        const subscription2 = model.usersObservable.subscribe((e) => {
            if (userEventReceived == false) {
                userEventReceived = true;
                // console.log(arguments);
                expect(e.emitter).equals(user);
                expect(e.eventType).equals(EventType.CallAdded);
                expect(e.data.call.id).equals(newCall.id);
            }
        });

        // Process notification
        const xmlNotification = $(xmlCallUpdateSourceNotification).children();
        xmppHandler.handleNotification(xmlNotification);

        subscription1.unsubscribe();
        subscription2.unsubscribe();

        // Checks
        expect(callEventReceived).equals(true);
        expect(userEventReceived).equals(true);
        expect((newCall.source as UserCallPoint).getUser()).equals(user);
    });

    it('notification.call.update (source = user)', () => {

        // Call-event checks
        let callEventReceived = false;
        const subscription1 = model.callsObservable.subscribe((e) => {
            if (callEventReceived == false) {
                callEventReceived = true;
                // console.log(arguments);
                expect(e.emitter).equals(newCall);
                expect(e.eventType).equals(EventType.UserAdded);
                expect(e.data.user.id).equals(user.id);
            }
        });

        // User-event checks
        let userEventReceived = false;
        const subscription2 = model.usersObservable.subscribe((e) => {
            if (userEventReceived == false) {
                userEventReceived = true;
                // console.log(arguments);
                expect(e.emitter).equals(user);
                expect(e.eventType).equals(EventType.CallAdded);
                expect(e.data.call.id).equals(newCall.id);
            }
        });

        // Process notification
        const xmlNotification = $(xmlCallUpdateDestinationNotification).children();
        xmppHandler.handleNotification(xmlNotification);

        subscription1.unsubscribe();
        subscription2.unsubscribe();

        // Checks
        expect(callEventReceived).equals(true);
        expect(userEventReceived).equals(true);
        expect((newCall.destination as UserCallPoint).getUser()).equals(user);
    });

    it('notification.call.update (destination = queue)', () => {

        // Process notification
        const xmlNotification = $(xmlCallUpdateDestinationQueueNotification).children();
        xmppHandler.handleNotification(xmlNotification);

        // Call events: user removed, queue added, call changed
        expect(callEvents.size()).equals(3);
        let ev = callEvents.next();
        expect(ev.eventType).equals(EventType.UserRemoved);

        ev = callEvents.next();
        expect(ev.eventType).equals(EventType.QueueAdded);
        const call = ev.emitter as Call;
        expect(call.destination.type).equals(CallPointType.queue);
        const callpoint = call.destination as QueueCallPoint;
        expect(callpoint.queueId).equals("2");

        ev = callEvents.next();
        expect(ev.eventType).equals(EventType.Changed);
        expect(ev.data.updateType).equals('destination');
        expect(ev.data.oldCallpoint.type).equals(CallPointType.user);
        expect(call.destination.type).equals(CallPointType.queue);

        // User: removed from call
        expect(userEvents.size()).equals(1);
        ev = userEvents.next();
        expect(ev.eventType).equals(EventType.CallRemoved);

        // Queue: added to call
        expect(queueEvents.size()).equals(1);
        ev = queueEvents.next();
        expect(ev.eventType).equals(EventType.CallAdded);
        expect(ev.data.call.id).equals(callId2);
    });

    it('notification.call.update (state = ringing)', () => {

        // Process notification
        const xmlNotification = $(xmlCallUpdateStateNotification).children();
        xmppHandler.handleNotification(xmlNotification);

        // Call events: call-state changed + callpoint state changed
        expect(callEvents.size()).equals(2);
        let ev = callEvents.next();
        expect(ev.eventType).equals(EventType.Changed);
        expect(ev.data.updateType).equals("state");
        expect(newCall.state).equals(CallState.ringing);
        expect(newCall.destination.state).equals(CallPointState.ringing);

        ev = callEvents.next();
        expect(ev.data.oldCallpoint.state).equals(CallPointState.connecting);
    });

    it('notification.call.end', () => {

        const xmlNotificationCallEnd = $(xmlCallEndNotification).children();
        xmppHandler.handleNotification(xmlNotificationCallEnd);

        // Call events
        expect(callEvents.size()).equals(3);

        let ev = callEvents.next();
        expect(ev.emitter).equals(newCall);
        expect(ev.eventType).equals(EventType.UserRemoved);
        expect(ev.data.user.id).equals(user.id);

        ev = callEvents.next();
        expect(ev.eventType).equals(EventType.QueueRemoved);

        ev = callEvents.next();
        expect(ev.emitter).equals(newCall);
        expect(ev.eventType).equals(EventType.Removed);
        expect(ev.data.reason).equals(CallEndReason.destinationHangup);

        // User events
        expect(userEvents.size()).equals(1);

        ev = userEvents.next();
        expect(ev.emitter).equals(user);
        expect(ev.eventType).equals(EventType.CallRemoved);
        expect(ev.data.call.id).equals(newCall.id);

        // Model checks
        expect(model.calls[callId2]).to.be.undefined;
    });
});

describe('XmppHandler :: Queue', () => {
    const xmppHandler = getEmptyXmppHandler();
    const queueId = '1442896';
    const userId = '8323556';
    const model = xmppHandler.model;
    const callId = 'IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0';
    const call = new Call(callId, null, model);
    xmppHandler.addCall(call, false);

    it('getQueues', () => {

        // Add a user first
        const xmlNotification = $(xmlCreateUserNotification).children();
        xmppHandler.handleNotification(xmlNotification);

        // Queue
        const xmlQueues = $(xmlGetQueuesResult).find('>result').children();

        xmppHandler.setQueuesFromXmpp(xmlQueues);
        expect(model.queues[queueId]).to.not.be.undefined;
        expect(model.queues[queueId].name).equals('My Queue');
        expect(model.queues[queueId].getUsers()).includes(model.users[userId]);
    });

    it('notification.queue.call.enter', () => {

        let eventReceived = false;
        const subscription = model.queuesObservable.subscribe((e) => {
            eventReceived = true;
        });

        const xmlNotification = $(xmlQueueCallEnterNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        subscription.unsubscribe();

        // NO event received (queue-call handling is done via callUpdate notifications)
        expect(eventReceived).equals(false);
    });

    it('notification.queue.call.leave', () => {

        let eventReceived = false;
        const subscription = model.queuesObservable.subscribe((e) => {
            eventReceived = true;
        });

        const xmlNotification = $(xmlQueueCallLeaveNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        subscription.unsubscribe();

        // NO event received (queue-call handling is done via callUpdate notifications)
        expect(eventReceived).equals(false);
    });
    it('notification.queue.update', () => {
        const queue = model.queues[queueId];

        let eventReceived = false;
        const subscription = model.queuesObservable.subscribe((e) => {
            if (eventReceived == false) {
                eventReceived = true;
                expect(e.emitter).equals(queue);
                expect(e.eventType).equals(EventType.PropertyChanged);
                expect(e.data.name).equals('name');
            }
        });

        const xmlNotification = $(xmlQueueUpdateNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        subscription.unsubscribe();

        expect(eventReceived).equals(true);
        expect(queue.name).equals('Her Queue');
    });

    it('notification.queue.create', () => {

        let event: Event;
        const subscription = model.queuesObservable.subscribe((e) => {
            event = e;
        });

        xmppHandler.handleNotification($(xmlCreateQueueNotification).children());

        expect(event).is.not.undefined;
        expect(event.eventType).equals(EventType.Added);
        const q = event.emitter as Queue;
        expect(q.id).equals("2");
        expect(q.name).equals("queue1");
    });

    it('notification.queueMember.leave', () => {

        const queue = model.queues[queueId];
        let eventReceived = false;
        const subscription = model.queuesObservable.subscribe((e) => {
            if (eventReceived == false) {
                eventReceived = true;
                expect(e.emitter).equals(queue);
                expect(e.eventType).equals(EventType.UserRemoved);
                expect(e.data.user.id).equals(userId);
            }
        });

        const xmlNotification = $(xmlQueueMemberLeaveNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        subscription.unsubscribe();

        expect(eventReceived).equals(true);
        expect(queue.queueMembers.length).equals(0);
    });
    it('notification.queueMember.enter', () => {

        const queue = model.queues[queueId];
        let eventReceived = false;
        const subscription = model.queuesObservable.subscribe((e) => {
            if (eventReceived == false) {
                eventReceived = true;
                expect(e.emitter).equals(queue);
                expect(e.eventType).equals(EventType.UserAdded);
                expect(e.data.user.id).equals(userId);
            }
        });

        const xmlNotification = $(xmlQueueMemberEnterNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        subscription.unsubscribe();

        expect(eventReceived).equals(true);
        expect(queue.queueMembers.length).equals(1);
    });
    it('notification.queueMember.update (Pause)', () => {

        const queue = model.queues[queueId];
        const user = model.users[userId];
        let eventReceived = false;

        const subscription = model.usersObservable.subscribe((e) => {
            if (eventReceived == false) {
                eventReceived = true;
                expect(e.emitter).equals(user);
                expect(e.eventType).equals(EventType.Paused);
                expect(e.data.queue.id).equals(queueId);
            }
        });

        expect(queue.isUserPausedInQueue(userId)).equals(false);

        const xmlNotification = $(xmlQueueMemberPauseNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        subscription.unsubscribe();

        expect(queue.isUserPausedInQueue(userId)).equals(true);
        expect(eventReceived).equals(true);
    });

    it('notification.queueMember.update (Unpause)', () => {

        const queue = model.queues[queueId];
        const user = model.users[userId];
        let eventReceived = false;

        const subscription = model.usersObservable.subscribe((e) => {
            if (eventReceived == false) {
                eventReceived = true;
                expect(e.emitter).equals(user);
                expect(e.eventType).equals(EventType.Unpaused);
                expect(e.data.queue.id).equals(queueId);
            }
        });

        expect(queue.isUserPausedInQueue(userId)).equals(true);

        const xmlNotification = $(xmlQueueMemberUnpauseNotification).children();
        xmppHandler.handleNotification(xmlNotification);
        subscription.unsubscribe();

        expect(queue.isUserPausedInQueue(userId)).equals(false);
        expect(eventReceived).equals(true);
    });

    it('notification.queue.destroy', () => {

        // Create queue
        xmppHandler.handleNotification($(xmlCreateQueueNotification).children());
        const newQueueId = 2;

        const queue = model.queues[newQueueId];

        let eventReceived = false;
        const subscription = model.queuesObservable.subscribe((e) => {
            if (eventReceived == false) {
                eventReceived = true;
                expect(e.emitter).equals(queue);
                expect(e.eventType).equals(EventType.Removed);
            }
        });


        expect(model.queues[2]).is.not.undefined;
        xmppHandler.handleNotification($(xmlQueueDestroyNotification).children());
        subscription.unsubscribe();
        expect(model.queues[2]).is.undefined;

        expect(eventReceived).equals(true);

    });

    it('removeQueue', () => {
        let event: Event;
        const subscription = model.queuesObservable.subscribe((e) => {
            event = e;
        });

        expect(model.queues[queueId]).is.not.undefined;
        xmppHandler.removeQueue(queueId);
        expect(model.queues[queueId]).is.undefined;

        expect(event).is.not.undefined;
        expect(event.eventType).equals(EventType.Removed);
        const q = event.emitter as Queue;
        expect(q.id).equals(queueId);
    });
});
