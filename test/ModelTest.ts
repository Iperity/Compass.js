import {Connection} from "../src/Connection";
import {Model} from "../src/Model";
import {CompassObject, User, Queue, QueueMember, Call, Company, CallState, CallPoint, CallPointState, UserCallPoint, QueueCallPoint} from "../src/Model";
import { expect } from 'chai';

// Setup jQuery for tests.

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = (new JSDOM());
const globalAny: any = global;
const $ = globalAny.jQuery = require('jquery')(window);

/* Constants */
const   CALL_STATE_RINGING      = CallState.ringing,
        CALLPOINT_STATE_RINGING = CallPointState.ringing;

const   USER_ID_1 = "user1",
        USER_ID_2 = "user2",
        QUEUE_ID_1 = "queue1",
        QUEUE_ID_2 = "queue2",
        CALL_ID_1 = "call1";

function getTestModel(): Model {
    const connection: Connection = new Connection('test.com');
    const model = new Model();

    // User1
    const user1 = new User(USER_ID_1, null, model);
    user1.jid = "user1@domain.com";
    model.users[user1.id] = user1;

    // User2
    const user2 = new User(USER_ID_2, null, model);
    model.users[user2.id] = user2;

    // queue1 with user1
    const queue1 = new Queue(QUEUE_ID_1, null, model);
    const queueMemberUser1Queue1 = new QueueMember(user1.id, queue1.id, "1", "0", model);
    queue1.queueMembers.push(queueMemberUser1Queue1);
    model.queues[queue1.id] = queue1;

    // queue2 with user1 paused
    const queue2 = new Queue(QUEUE_ID_2, null, model);
    const queueMemberUser1Queue2 = new QueueMember(user1.id, queue2.id, "2", "" + Date.now(), model);
    queue2.queueMembers.push(queueMemberUser1Queue2);
    model.queues[queue2.id] = queue2;

    // Call between user1 and queue2
    const userCallpoint = new UserCallPoint("usercallpoint1", null, model);
    userCallpoint.userId = USER_ID_1;
    userCallpoint.state = CALLPOINT_STATE_RINGING;
    const queueCallpoint = new QueueCallPoint("queuecallpoint1", null, model);
    queueCallpoint.queueId = QUEUE_ID_2;
    const call1 = new Call(CALL_ID_1, null, model);
    call1.source = userCallpoint;
    call1.destination = queueCallpoint;
    model.calls[call1.id] = call1;


    return model;
}

describe('Model', () => {
   it('getUserForJid', () => {
        const model = getTestModel();
        expect(model.getUserForJid('nonExistingJid')).to.be.undefined;
        expect(model.getUserForJid('user1@domain.com')).to.equal(model.users[USER_ID_1]);
   });
});

describe('Model :: Callpoint', () => {
    it('durations', () => {
        const model = getTestModel();
        const cp = model.calls[CALL_ID_1].source;

        expect(cp.getDuration()).to.be.NaN;
        expect(cp.getAnsweredDuration()).to.be.NaN;

        cp.timeCreated = 100;
        expect(cp.getDuration() > 100).is.true;
        expect(cp.getAnsweredDuration()).to.be.NaN;

        cp.timeStarted = 200;
        expect(cp.getAnsweredDuration() < cp.getDuration()).is.true;
        expect(cp.getAnsweredDuration() > 200).is.true;
    });
});

describe('Model :: User', () => {
    it('getQueues', () => {
        const model = getTestModel();
        const user = model.users[USER_ID_1];
        expect(user.getQueues()).to.contain(model.queues[QUEUE_ID_1]);
        expect(user.getQueues()).to.contain(model.queues[QUEUE_ID_2]);
        expect(user.getQueues().length).equals(2);
    });

    it('getPausedQueues', () => {
        const model = getTestModel();
        const user = model.users[USER_ID_1];
        expect(user.getPausedQueues()).to.contain(model.queues[QUEUE_ID_2]);
        expect(user.getPausedQueues()).to.not.contain(model.queues[QUEUE_ID_1]);
        expect(user.getPausedQueues().length).equals(1);
    });

    it('getCalls', () => {
        const model = getTestModel();
        const user = model.users[USER_ID_1];
        expect(user.getCalls()).to.contain(model.calls[CALL_ID_1]);
        expect(user.getCalls().length).equals(1);
    });
});

describe('Model :: Queue', () => {
    it('getUsers', () => {
        const model = getTestModel();
        const queue = model.queues[QUEUE_ID_1];
        expect(queue.getUsers()).to.contain(model.users[USER_ID_1]);
        expect(queue.getUsers().length).equals(1);
    });

    it('getPausedUsers', () => {
        const model = getTestModel();
        const queue = model.queues[QUEUE_ID_2];
        expect(queue.getPausedUsers()).to.contain(model.users[USER_ID_1]);
        expect(queue.getPausedUsers().length).equals(1);
    });

    it('getPausedUsers on queue without paused users', () => {
        const model = getTestModel();
        const queue = model.queues[QUEUE_ID_1];
        expect(queue.getPausedUsers()).to.not.contain(model.users[USER_ID_1]);
        expect(queue.getPausedUsers().length).equals(0);
    });

    it('isUserInQueue', () => {
        const model = getTestModel();
        const queue = model.queues[QUEUE_ID_1];
        expect(queue.isUserInQueue(USER_ID_1)).to.equal(true);
        expect(queue.isUserInQueue(USER_ID_2)).to.equal(false);
    });

    it('isUserPausedInQueue', () => {
        const model = getTestModel();
        const queue1 = model.queues[QUEUE_ID_1];
        const queue2 = model.queues[QUEUE_ID_2];
        expect(queue1.isUserPausedInQueue(USER_ID_1)).to.equal(false);
        expect(queue2.isUserPausedInQueue(USER_ID_1)).to.equal(true);
    });

    it('getCalls', () => {
        const model = getTestModel();

        const queue1 = model.queues[QUEUE_ID_1];
        expect(queue1.getCalls().length).to.equal(0);

        const queue2 = model.queues[QUEUE_ID_2];
        expect(queue2.getCalls()).to.contain(model.calls[CALL_ID_1]);
    });
});

describe('Model :: UserCallpoint', () => {
    it('getUser', () => {
        const model = getTestModel();
        const userCallpoint = new UserCallPoint("usercallpoint1", null, model);
        userCallpoint.userId = USER_ID_1;
        expect(userCallpoint.getUser()).to.not.be.undefined;
        expect(userCallpoint.getUser()).to.equal(model.users[USER_ID_1]);

    });

    it("getUser should return undefined if the user doesn't exist", () => {
        const model = getTestModel();
        const userCallpoint = new UserCallPoint("usercallpoint2", null, model);
        userCallpoint.userId = "unknownuser";
        expect(userCallpoint.getUser()).to.be.undefined;
    });
});

describe('Model :: QueueCallpoint', () => {
    it('getQueue', () => {
        const model = getTestModel();
        const queueCallpoint = new QueueCallPoint("queuecallpoint1", null, model);
        queueCallpoint.queueId = QUEUE_ID_1;
        expect(queueCallpoint.getQueue()).to.not.be.undefined;
        expect(queueCallpoint.getQueue()).to.equal(model.queues[QUEUE_ID_1]);

    });

    it("getQueue should return undefined if the queue in the dialpoint doesn't exist", () => {
        const model = getTestModel();
        const queueCallpoint = new QueueCallPoint("queuecallpoint2", null, model);
        queueCallpoint.queueId = "unknownQueue";
        expect(queueCallpoint.getQueue()).to.be.undefined;
    });
});

describe('Model :: QueueMember', () => {
    it('isPaused', () => {
        const model = getTestModel();
        const queue1 = model.queues[QUEUE_ID_1];
        const queue1Member = queue1.getQueueMember(USER_ID_1);
        expect(queue1Member.isPaused()).to.equal(false);
        const queue2 = model.queues[QUEUE_ID_2];
        const queue2Member = queue2.getQueueMember(USER_ID_1);
        expect(queue2Member.isPaused()).to.equal(true);
    });

    it('priority', () => {
        const model = getTestModel();
        const queue1 = model.queues[QUEUE_ID_1];
        const queue1Member = queue1.getQueueMember(USER_ID_1);
        expect(queue1Member.priority).to.equal(1);
        const queue2 = model.queues[QUEUE_ID_2];
        const queue2Member = queue2.getQueueMember(USER_ID_1);
        expect(queue2Member.priority).to.equal(2);
    });

    it('getUser', () => {
        const model = getTestModel();
        const queue1 = model.queues[QUEUE_ID_1];
        const queue1Member = queue1.getQueueMember(USER_ID_1);
        expect(queue1Member.getUser()).to.equal(model.users[USER_ID_1]);
    });

    it('getQueue', () => {
        const model = getTestModel();
        const queue2 = model.queues[QUEUE_ID_2];
        const queue2Member = queue2.getQueueMember(USER_ID_1);
        expect(queue2Member.getQueue()).to.equal(model.queues[QUEUE_ID_2]);
    });
});
