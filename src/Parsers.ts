/**
 * Parsers, converting XML to our model objects.
 */

import {
    Call,
    CallPoint,
    CallPointState,
    CallPointType,
    CallState,
    Company,
    CompassObject,
    DialplanCallPoint,
    ExternalCallPoint,
    Language,
    Queue,
    QueueCallPoint,
    QueueMember,
    User,
    UserCallPoint,
} from "./Model";
import {Model} from "./Model";
import {compassLogger} from "./Logging";

// ============================ Registry ============================

interface IParser {
    parse(elem: JQuery, parserContext: ParserContext): CompassObject;
}

/*
 * Pojo object to pass relevant data to the parsers.
 */
class ParserContext {
    constructor(parser: ParserRegistry, model: Model) {
        this.parser = parser;
        this.model = model;
    }

    public parser: ParserRegistry;
    public model: Model;
}

export enum ObjectType {
    Company, User, Queue, Call, CallPoint,
}


/*
 * Parses XML objects, passes objects on to the right Parser based on type.
 */
export class ParserRegistry {

    private readonly _parserContext;

    constructor(model: Model) {
        this._parserContext = new ParserContext(this, model);
    }

    /**
     * Parse the XMPP XML object.
     *
     * @param {JQuery} elem - XML XMPP object to parse.
     * @param {ObjectType} type - The type of the object to parse.
     * @returns {CompassObject} - A CompassObject parsed from the XML.
     */
    public parse(elem: JQuery, type: ObjectType): CompassObject {
        const parser = ParserRegistry._parsers[type];
        if (!parser) {
            compassLogger.warn(`No parser available for type ${type}, returning null.` );
            return null;
        }
        if (!elem) {
            throw new Error("trying to parse null element");
        }
        return parser.parse(elem, this._parserContext);
    }

    // Static functionality =========================

    // Map of all available parsers, stored by type that they parse.
    private static readonly _parsers: {[type: string]: IParser} = {};

    public static registerParser(parser: IParser, type: ObjectType) {  // add a parser to the parser-set.
        ParserRegistry._parsers[type] = parser;
    }
}

// ============================ Users ============================

class UserParser implements IParser {
    public parse(elem: JQuery, parserContext: ParserContext): CompassObject {
        const id = elem.attr('id');
        const user = new User(id, elem, parserContext.model);
        user.name = elem.find('>name').text();
        user.loggedIn = parseBoolean(elem.find('>loggedIn').text());
        const exts = elem.find('>extensions').text();
        user.extensions = exts ? exts.split(',') : [];
        user.jid = elem.find('>identifiers>xmppJid').text();
        user.username = elem.find('>identifiers>compassId').text();
        user.phoneId = parseNumberOrNull(elem.find('>location').text());
        user.contact = elem.find('>contact').text();
        user.language = elem.find('>language').text() as Language;
        return user;
    }
}
ParserRegistry.registerParser(new UserParser(), ObjectType.User);

// ============================ Company ============================

class CompanyParser implements IParser {
    public parse(elem: JQuery, parserContext: ParserContext): CompassObject {
        const companyId = elem.find('>id').text();
        const company = new Company(companyId, elem, parserContext.model);
        company.name = elem.find('>name').text();
        return company;
    }
}
ParserRegistry.registerParser(new CompanyParser(), ObjectType.Company);

// ============================ Queue ============================

class QueueParser implements IParser {
    public parse(elem: JQuery, parserContext: ParserContext): CompassObject {
        const queue = new Queue(elem.attr('id'), elem, parserContext.model);
        queue.name = elem.find('>name').text();

        elem.find('userEntries').children().toArray().map((entry) => $(entry)).forEach((userEntryElem) => {
            const userId = userEntryElem.find(">userId").text();
            const pausedSince = userEntryElem.find('>pausedSince').text();
            const priority = userEntryElem.find(">priority").text();
            const queueMember = new QueueMember(userId, queue.id, priority, pausedSince, parserContext.model);
            queue.queueMembers.push(queueMember);
        });

        // Calls are added to queues through the Callpoints in the call, so we don't need to parse the callIds element.
        return queue;
    }
}
ParserRegistry.registerParser(new QueueParser(), ObjectType.Queue);

// ============================ Call ============================

class CallParser implements IParser {
    public parse(elem: JQuery, parserContext: ParserContext): CompassObject {
        const id = elem.attr('id');
        const call = new Call(id, elem, parserContext.model);
        call.state = elem.find('>state').text() as CallState;
        const parser = parserContext.parser;  // We need the parser to parse the callPoints.
        call.source = parser.parse(elem.find('>source'), ObjectType.CallPoint) as CallPoint;
        call.destination = parser.parse(elem.find('>destination'), ObjectType.CallPoint) as CallPoint;
        
        const parentCallElem = elem.find('>properties >QueueCallForCall');
        if (parentCallElem.length) {
            call.parentCall = parserContext.model.calls[parentCallElem.text()];
        }

        return call;
    }
}
ParserRegistry.registerParser(new CallParser(), ObjectType.Call);

// ============================ Callpoint ============================

interface ICallPointSubtypeParser {
    parse(id: string, elem: JQuery, context: ParserContext): CallPoint;
}

class CallPointParser implements IParser {

    private static readonly _types: {[type: string]: ICallPointSubtypeParser} = {};

    public static register(parser: ICallPointSubtypeParser, type: CallPointType) {
        this._types[type] = parser;
    }

    public parse(elem: JQuery, context: ParserContext): CompassObject {
        const callPointTypeStr = elem.attr('type');

        const id = elem.attr('id');
        const parser = CallPointParser._types[callPointTypeStr];
        const object = parser ? parser.parse(id, elem, context) : new CallPoint(id, elem, context.model);
        this.fillBaseObject(object, elem);
        return object;
    }

    private fillBaseObject(cp: CallPoint, elem: JQuery) {
        cp.type = elem.attr('type') as CallPointType;
        cp.state = elem.find('>state').text() as CallPointState;
        cp.timeCreated = Number(elem.find('>timeCreated').text());
        cp.timeStarted = parseNumberOrNull(elem.find('>timeStarted').text());
        //cp.timeEnded = parseNumberOrNull(elem.find('>timeEnded').text());
    }
}
ParserRegistry.registerParser(new CallPointParser(), ObjectType.CallPoint);

class UserCallPointParser implements ICallPointSubtypeParser {
    public parse(id: string, elem: JQuery, parserContext: ParserContext): CallPoint {
        const cp = new UserCallPoint(id, elem, parserContext.model);
        cp.userId = elem.find('>userId').text();
        return cp;
    }
}
CallPointParser.register(new UserCallPointParser(), CallPointType.user);

class QueueCallPointParser implements ICallPointSubtypeParser {
    public parse(id: string, elem: JQuery, parserContext: ParserContext): CallPoint {
        const cp = new QueueCallPoint(id, elem, parserContext.model);
        cp.queueId = elem.find('>queueId').text();
        cp.queueName = elem.find('>queueName').text();
        return cp;
    }
}
CallPointParser.register(new QueueCallPointParser(), CallPointType.queue);

class ExternalCallPointParser implements ICallPointSubtypeParser {
    public parse(id: string, elem: JQuery, parserContext: ParserContext): CallPoint {
        const cp = new ExternalCallPoint(id, elem, parserContext.model);
        cp.number = elem.find('>number').text();
        cp.name = elem.find('>name').text();
        return cp;
    }
}
CallPointParser.register(new ExternalCallPointParser(), CallPointType.external);

class DialplanCallPointParser implements ICallPointSubtypeParser {
    public parse(id: string, elem: JQuery, parserContext: ParserContext): CallPoint {
        const cp = new DialplanCallPoint(id, elem, parserContext.model);
        cp.exten = elem.find('>exten').text();
        cp.description = elem.find('>description').text();
        return cp;
    }
}
CallPointParser.register(new DialplanCallPointParser(), CallPointType.dialplan);


// // ============================ Utilities ============================

export function parseNumberOrNull(val: string) {
    return val === '' ? null : Number(val);
}

export function parseBoolean(val: string) {
    return val === 'true';
}
