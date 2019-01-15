let conn;
let model;
let initFailed = false;
let api;
let selfUser;

// Troubleshooting:
// compass.compassLogger.setLevel('debug');

log.setLevel('debug');

$(document).ready(function () {

    $('#login_server').val('pbx.hosted-compass.com');

    $('#login_form').submit(function () {
        try {
            login();
        } catch (e) {
            alert(e);
        }
        return false;
    });

    let username = localStorage ? localStorage.getItem('username') : null;
    if (username) {
        $('#login_username').val(username);
        $('#login_server').val(localStorage.getItem('server'));
        if (localStorage.getItem('password')) {
            $('#login_password').val(localStorage.getItem('password'));
            $('#save_password').prop('checked', true);
        }
    }
});

function login() {

    initFailed = false;
    $('#login_container').hide();
    $('#loading').show();
    $('#login_error').hide();

    let username = $('#login_username').val();
    let password = $('#login_password').val();
    let storePassword = $('#save_password').prop("checked");
    let server = $('#login_server').val();

    localStorage.setItem('username', username);
    localStorage.setItem('server', server);
    if (storePassword) {
        localStorage.setItem('password', password);
    } else {
        localStorage.removeItem('password');
    }

    conn = new compass.Connection(server);
    model = conn.model;

    // Setup logging and status messages.
    conn.statusCallback = connectionStatusCallback;

    $('#connection_status').text('Connecting...');

    let jid = username;
    if (jid.indexOf('@') === -1) {
        jid = username + '@uc.' + server;
    }

    const connectedPromise = conn.connect(jid, password);

    // Get the company-model
    connectedPromise.then(
        gotModel,
        function (msg) {
            showError(msg);
        });
}

function showError(msg) {
    // already showing error message
    if (initFailed)
        return;

    initFailed = true;

    $('#loading').hide();
    $('#login_container').show();
    let err = $('#login_error');
    err.show();
    err.text(msg);
}

function connectionStatusCallback(status, msg) {
    $('#connection_status').text(msg);
    log.info("Strophe: status is ", status, msg);
}

function gotModel() {

    api = conn.rest;
    selfUser = model.getUserForJid(conn.jid);

    // Show interface
    $('#login').hide();
    $('#container').show();

    // Add queues to interface.
    for (let queueId in model.queues) {
        addQueue(model.queues[queueId]);
    }

    model.queuesObservable.subscribe(event => handleQueueEvent(event));
}

function getQueueElement(queue) {
    return $('#queue_' + queue.id);
}

function addQueue(queue) {
    let elem = $('#tpl_queue').clone();
    elem.attr('id', 'queue_' + queue.id);
    elem.find('.queue_login').on('click', () => logonQueue(queue));

    $('#queue-list').append(elem);
    updateQueue(queue, elem);

    return elem;
}

function handleQueueEvent(event) {

    let queue = event.emitter;
    let elem = getQueueElement(queue);

    switch (event.eventType) {
        case compass.EventType.Added:
            addQueue(queue);
            break;

        case compass.EventType.Removed:
            elem.remove();
            break;

        default:
            updateQueue(queue, elem);
            break;
    }
}

function updateQueue(queue, elem) {

    elem.find('.queue_name').text(queue.name);

    let agents = queue.getUsers().filter(u => u.loggedIn).length;
    let calls = queue.getCalls().length;

    elem.find('.queue_agents').text('Agents: ' + agents);
    elem.find('.queue_calls').text('Calls in queue: ' + calls);

    let color;
    if (calls === 0) {
        color = '#CFD8DC';
    } else if (calls < 2) {
        color = '#57C7B4';
    } else {
        color = '#FF8B26';
    }
    elem.animate({backgroundColor: color}, {duration: 1000, queue: false});

    let isMember = queue.getUsers().indexOf(selfUser) !== -1;
    let loginBtn = elem.find('.queue_login');
    if (isMember) {
        elem.find('.queue_user').show();
        loginBtn.text('Log off');
        loginBtn.addClass('logout');
        loginBtn.removeClass('login');
    } else {
        elem.find('.queue_user').hide();
        loginBtn.text('Log on');
        loginBtn.addClass('login');
        loginBtn.removeClass('logout');
    }
}

function logonQueue(queue) {
    let isMember = queue.getUsers().indexOf(selfUser) !== -1;
    if (isMember) {
        api.post(`user/${selfUser.id}/logoutQueue`, {
            queue: api.getUrlForObject('queue', queue.id),
        });
    } else {
        api.post(`user/${selfUser.id}/loginQueue`, {
            queue: api.getUrlForObject('queue', queue.id),
            priority: 1,
            callForward: false,
        });
    }
}
