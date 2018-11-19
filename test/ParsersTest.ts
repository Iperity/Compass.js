import Model, {
    Call,
} from "../src/Model";
import {expect} from 'chai';
import {ObjectType, ParserRegistry} from "../src/Parsers";

import {JSDOM} from "jsdom";
const { window } = new JSDOM();
const $ = require('jquery')(window);

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
);

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
        
        const childCall = registry.parse($(callSetupWithParent).children(), ObjectType.Call) as Call;
        expect(childCall.parentCall).to.equal(parentCall);
    });
});
