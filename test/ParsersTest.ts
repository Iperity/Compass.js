import * as $ from 'jquery';
import {Call, CallPoint, CallPointType, Model, ResourceCallPoint, ResourceType, UserCallPoint, ListenInCallPoint} from "../src/Model";
import {expect} from 'chai';
import {ObjectType, ParserRegistry} from "../src/Parsers";

const callSetupWithParent = $.parseXML(
    '<call xmlns="http://iperity.com/compass" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
    'id="IKhDw.MuTOkUTDa8nEV-6dd.c133ada042758fa0b92a6ed8621bd224.0">\n' +
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
    '      <properties><QueueCallForCall>123</QueueCallForCall></properties>\n' +
    '   </call>'
).documentElement;

// Tests

describe('Parsers :: Call', () => {
    
    let model: Model;
    let registry: ParserRegistry;

    beforeEach(() => {
        model = new Model();
        registry = new ParserRegistry(model);
    });
    
    it('callSetupWithParent', () => {
        
        const parentCall = new Call('123', null, model);
        model.calls['123'] = parentCall;
        
        const childCall = registry.parse($(callSetupWithParent), ObjectType.Call) as Call;
        expect(childCall.parentCall).to.equal(parentCall);
    });
});

describe('Parsers :: Callpoints', () => {

    function parseCallpoint<T extends CallPoint>(xmlString: string): T {
        // need to wrap the elem inside a call, as the CallpointParsers are not public
        const callXml = $.parseXML(`
<call xmlns="http://iperity.com/compass" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    ${xmlString}
</call>
        `).documentElement;
        
        const call = new ParserRegistry(new Model()).parse($(callXml), ObjectType.Call) as Call;
        return call.source as T;
    }
    
    it('parses a ResourceCallpoint', () => {

        const cp = parseCallpoint<ResourceCallPoint>(`
<source xsi:type='callpointResource' type='Resource' id='873'>
    <timeCreated>1548172429</timeCreated>
    <timeStarted>1548172429</timeStarted>
    <state>ANSWERED</state>
    <properties/>
    <resourceType>nameprefix</resourceType>
    <resourceId>458035</resourceId>
    <name>[prefix]</name>
</source>
    `);
        
        expect(cp.type).to.equal(CallPointType.resource);
        expect(cp.resourceType).to.equal(ResourceType.nameprefix);
        expect(cp.resourceId).to.equal('458035');
        expect(cp.name).to.equal('[prefix]');
    });

    it('parses an unknown ResourceType', () => {

        const cp = parseCallpoint<ResourceCallPoint>(`
<source xsi:type='callpointResource' type='Resource' id='873'>
    <resourceType>someUnexistingResourceType</resourceType>
</source>
    `);

        expect(cp.type).to.equal(CallPointType.resource);
        // This is how Typescript enums work: you can just use any string
        // Let's keep that behavior, so clients can work with resource types even
        // if they're not yet added to the library.
        expect(cp.resourceType).to.equal('someUnexistingResourceType');
    });

    it('parses a UserCallpoint', () => {

        const cp = parseCallpoint<UserCallPoint>(`
<source xsi:type='callpointUser' type='User' id='876'>
    <timeCreated>1548176020</timeCreated>
    <state>ANSWERED</state>
    <properties/>
    <userId>11110</userId>
    <userName>testuser</userName>
    <identityId>8426</identityId>
</source>
    `);

        expect(cp.type).to.equal(CallPointType.user);
        expect(cp.userId).to.equal('11110');
        expect(cp.userName).to.equal('testuser');
        expect(cp.identityId).to.equal('8426');
    });

    it('parses a ListenInCallPoint', () => {

        const cp = parseCallpoint<ListenInCallPoint>(`
<source xsi:type='callpointListenIn' type='ListenIn' id='4'>
    <timeCreated>1577043609</timeCreated>
    <state>ANSWERED</state>
    <properties/>
    <listenedToCallId>f768eece63a1b0057b938f5c31f7143de496665f</listenedToCallId>
</source>
    `);

        expect(cp.type).to.equal(CallPointType.listenIn);
        expect(cp.listenedToCallId).to.equal('f768eece63a1b0057b938f5c31f7143de496665f');
    });
    
});
