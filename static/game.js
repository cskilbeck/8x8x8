//////////////////////////////////////////////////////////////////////
// - game list
//      differentiate between my games and others
//      forking
//      paging in game list
//      refresh game list on logout
//      make the search text work (timeout on change)
//      quick search buttons: my games, top games, most played, recently added, recently changed
// - browser history
// - make main left pane fill available screen space (esp. editor)
// - user registration/login/forgot password
//      username, verify password etc
// - voting/rating/comments
// - telemetry/analytics
// - finish help pane content
// - editor view/edit mode with forking etc
// - ajax in progress spinner
// - ask if they want to save when quitting the editor if changes are unsaved
// - cache current game in editor for fast re-editing
// - callstack from runtime errors
//
// + save current source in LocalStorage
// + web service
// + save to web service
// + login form validation
// + game list pane
// + nice date formatting (momentjs)
// + pane history
// + fix game list table (column widths etc)
// + proper query for game list (incorporate username)
// + feedback on save/execute
// +    Promise from login for what happens after (save, copy)
//////////////////////////////////////////////////////////////////////

$(document).ready(function() {
    'use strict';

    var editor,
        user_id = null,
        user_session = null,
        user_name = null,
        panes = [ 'gameList', 'editorPane', 'helpPane' ],
        paneNames = [ 'Games', 'Editor', 'Help' ],
        panestack = [],
        loginDefer,
        choiceDefer,
        source,
        hidden = [
                'document', 'window', 'alert', 'parent', 'frames', 'frameElment',
                'history', 'fullScreen', 'innerHeight', 'innerWidth', 'length',
                'location', 'GlobalEventHandlers', 'WindowEventHandlers', 'opener',
                'performance', 'screen'
           ],
        preScript = 'function ClientScript(' + hidden.join() + ') { "use strict"; ',
        postScript = '; this.updateFunction = (typeof update === "function") ? update : null; };';

    function getFormObj(formId) {
        var formObj = {};
        var inputs = $('#'+formId).serializeArray();
        $.each(inputs, function (i, input) {
            formObj[input.name] = input.value;
        });
        return formObj;
    }

    function spinner(spin) {
        var s = $('#spinner');
        if(spin) {
            s.removeClass('glyphicon-ok');
            s.addClass('glyphicon-refresh gly-spin');
        }
        else {
            s.removeClass('glyphicon-refresh gly-spin');
            s.addClass('glyphicon-ok');
        }
    }

    function doAjax(func, url, data, progress, complete, fail) {
        var q = Q.defer();
        spinner(true);
        if(progress !== undefined) {
            reportStatus(progress);
        }
        func(url, data)
        .done(function(result) {
            spinner(false);
            if(complete !== undefined) {
                reportStatus(complete);
            }
            q.resolve(result);
        })
        .fail(function(xhr) {
            spinner(false);
            if(fail !== undefined) {
                reportError(fail);
            }
            q.reject(xhr);
        });
        return q.promise;
    }

    function get(url, data, progress, complete, fail) {
        data.user_session = user_session;
        data.user_id = user_id || 0;
        return doAjax($.get, url, data, progress, complete, fail);
    }

    function post(url, data, progress, complete, fail) {
        data.user_session = user_session;
        data.user_id = user_id || 0;
        return doAjax($.post, url, data, progress, complete, fail);
    }

    function format(str, col) {
        col = typeof col === 'object' ? col : Array.prototype.slice.call(arguments, 1);
        return str.replace(/\{\{|\}\}|\{(\w+)\}/g, function (m, n) {
            if (m == '{{') { return '{'; }
            if (m == '}}') { return '}'; }
            return col[n];
        });
    }

    window.makeChoice = function(choice) {
        if(choice) {
            choiceDefer.resolve();
        }
        else {
            choiceDefer.reject();
        }
    };

    window.deleteIt = function(gameID) {
        getChoice('Delete Game', 'Are you sure you want to delete this game? This action cannot be undone', 'Yes, delete it permanently', 'No')
        .then(function() {
            post('/api/delete', { game_id: gameID }, 'Deleting game...', '', 'Error deleting game')
            .then(function(result) {
                refreshGameList();
                reportStatus('Game deleted');
            },
            function(xhr){
                reportError(xhr.statusText);
            });
        },
        function() {
            console.log('No!');
        });
    };

    window.playIt = function(game_id) {
        get('/api/source', { game_id: game_id }, 'Getting game...', '', 'Error getting game')
        .then(function(result) {
            execute(result.source);
        },
        function(xhr) {
            reportError(xhr.statusText);
        });
    };

    function enable(id, enabled) {
        $(id).prop('disabled', !enabled);
    }

    function getSource(game_id) {
        var p = Q.defer();
        get('/api/source', { game_id: game_id }, 'Loading game...', '', 'Error loading game')
        .then(function(result) {
            editor.setValue(result.source, -1);
            editor.session.getUndoManager().reset();
            $('#gameName').val(result.game_title);
            p.resolve(result);
        },
        function(xhr) {
            reportError(xhr.statusText);
            p.reject();
        });
        return p.promise;
    }

    window.EditIt = function(game_id) {
        getSource(game_id)
        .then(function(result) {
            editor.setOptions({ readOnly: false, highlightActiveLine: true });
            enableKeyBindings();
            show('#saveButton', true);
            editor.session.getUndoManager().reset();
            enable("#gameName", true);
            showPane('editorPane');
        });
    };

    window.viewIt = function(game_id) {
        getSource(game_id)
        .then(function(result) {
            editor.setOptions({ readOnly: true, highlightActiveLine: false });
            disableKeyBindings();
            show('#saveButton', false);
            enable("#gameName", false);
            showPane('editorPane');
        });
    };

    function show(id, vis) {
        if(vis) {
            $(id).removeClass('masked');
        }
        else {
            $(id).addClass('masked');
        }
    }

    function getChoice(banner, text, yesText, noText) {
        choiceDefer = Q.defer();
        $('#choiceText').text(text);
        $('#choiceLabel').text(banner || '');
        $('#choiceYes').text(yesText || 'Yes');
        $('#choiceNo').text(noText || 'No');
        show('#choiceNo', true);
        $('#choiceModal').modal('show');
        return choiceDefer.promise;
    }

    function showAlert(banner, text, buttonText) {
        choiceDefer = Q.defer();
        $('#choiceText').text(text);
        $('#choiceLabel').text(banner || '');
        $('#choiceYes').text(buttonText || 'OK');
        show('#choiceNo', false);
        $('#choiceModal').modal('show');
        return choiceDefer.promise;
    }

    window.showPane = function(name, push) {
        var i, p;
        for(i in panes) {
            p = $('#' + panes[i]);
            if(name === panes[i]) {
                if(p.hasClass('masked') && push !== false) {
                    panestack.push(i);
                    show('#closeButton', true);
                }
                show(p, true);
                $('#paneTitle').text(paneNames[i]);
            }
            else {
                show(p, false);
            }
        }
    };

    window.popPane = function() {
        if(panestack.length > 1) {
            panestack.pop();
            showPane(panestack[panestack.length - 1], false);
            show('#closeButton', panestack.length > 1);
        }
    };

    window.clearError = function(e) {
        $('#statusBar').html('&nbsp;');
    };

    window.focusEditor = function() {
        focus();
        editor.focus();
    };

    window.reportStatus = function(e) {
        var sb = $('#statusBar');
        sb.text(e);
        sb.removeClass('statusError');
    };

    window.reportError = function(e) {
        var sb = $('#statusBar');
        sb.text(e);
        sb.addClass('statusError');
    };

    function doLogin() {
        post('/api/login', getFormObj('loginForm'), 'Logging in...', '', 'Error logging in')
        .then(function(result) {
            user_id = result.user_id;
            user_session = result.user_session;
            user_name = result.user_username;
            $('#loginModal').modal('hide');
            loginDefer.resolve();
        },
        function(xhr) {
            if(xhr.status === 401) {
                $('#loginMessage').show();
            }
            loginDefer.reject();
        });
        return loginDefer.promise;
    }

    function loginAnd() {
        loginDefer = Q.defer();
        if(user_id !== 0) {
            loginDefer.resolve();
        }
        else {
            $('#loginModal').modal('show');
        }
        return loginDefer.promise;
    }

    window.handleLogin = function(e) {
        loginDefer = Q.defer();
        doLogin().then(function() {
            showRegistrationInfo();
            refreshGameList();
        });
        return false;
    };

    window.handleRegister = function(e) {
        $('#registerMessage').text('');
        var data = getFormObj('registerForm');
        console.log(data);
        post('/api/register', data, 'Registering...', '', 'Error registering')
        .then(function(result) {
            console.log(result);
            if(result.status !== 'ok') {
                $('#registerMessage').html(result.message);
                $('#registerMessage').show();
            } else {
                // success - should be a user_id in there
                user_id = result.user_id;
                user_session = result.user_session;
                user_name = result.user_username;
                showRegistrationInfo();
                refreshGameList();
            }
        },
        function(xhr) {
            $('#registerMessage').html(xhr.statusText);
            $('#registerMessage').show();
        });
        return false;
    };

    function row(index, g) {

        var template =
            "<tr data-toggle='collapse' data-target='#row{index}' class='clickable' id='headerRow{index}' aria-expandable='true'>" +
                "<td>" +
                    "{game_title}" +
                "</td>" +
                "<td>" +
                    "{user}" +
                "</td>" +
                "<td>" +
                    "{lastsaved}" +
                "</td>" +
                "<td>" +
                    "{created}" +
                "</td>" +
                "<td>" +
                    "{rating}" +
                "</td>" +
            "</tr>" +
            "<tr class='hid'>" +
                "<td colspan='5'>" +
                    "<div class='accordion-body collapse tableContainer' id='row{index}' row='#headerRow{index}' collapsible aria-expanded='false' style>" +
                        "<table class='table inner'>" +
                            "<tbody>" +
                                "<tr>" +
                                    "<td colspan='5' class='butter'>" +
                                        "<button class='btn btn-xs btn-primary' onclick='viewIt({game_id})'>View &nbsp;<i class='glyphicon glyphicon-info-sign'></i></button>&nbsp;" +
                                        "<button class='btn btn-xs btn-success' onclick='playIt({game_id})'>Play &nbsp;<i class='glyphicon glyphicon-play'></i></button>&nbsp;" +
                                        "<button class='btn btn-xs btn-info' onclick='{action}It({game_id})'>{action} &nbsp;<i class='glyphicon glyphicon-edit'></i></button>&nbsp;" +
                                        "<button class='btn btn-xs btn-danger {hiddenIfNotMine}' onclick='deleteIt({game_id})'>Delete &nbsp;<i class='glyphicon glyphicon-trash'></i></button>" +
                                    "</td>" +
                                "</tr>" +
                                "<tr>" +
                                    "<td>Last Saved</td>" +
                                    "<td>{lastsaved}</td>" +
                                "</tr>" +
                                "<tr>" +
                                    "<td>Created</td>" +
                                    "<td>{created}</td>" +
                                "</tr>" +
                            "</tbody>" +
                        "</table>" +
                    "</div>" +
                "</td>" +
            "</tr>",
            isMine = g.user_id === user_id,
            copyEdit,
            star = function(x) {
                var r = '', i;
                    for(i = 1; i <= 5; ++i) {
                        r += format("<i class='{on}star glyphicon glyphicon-star'></i>", { on: (x >= i) ? 'yellow' : 'white' });
                    }
                    return r;
                },
            params = {
                rating: star(3),
                index: index,
                game_title: g.game_title,
                game_id: g.game_id,
                action: isMine ? 'Edit' : 'Copy',
                lastsaved: moment(g.game_lastsaved).fromNow(),
                created: moment(g.game_created).fromNow(),
                user: g.user_username,
                hiddenIfNotMine: isMine ? '' : 'masked'
            };
        return format(template, params);
    }

    window.refreshGameList = function() {
        var i, games = $('#games'), table = '';
        get('/api/list', { user_id: 0 })
        .then(function(result) {
            for(i in result.games) {
                table += row(i, result.games[i]);
            }
            $('#results').html(table);
        },
        function(xhr) {
            setStatus(xhr.statusText);
        });
    };

    window.showRegistration = function() {
        $('#loginModal').modal('hide');
        $('#registerModal').modal('show');
    };

    function showRegistrationInfo() {
        if(user_id !== 0 && user_session !== null && user_name !== null) {
            setCookie('user_userid', user_id, 30);
            setCookie('user_username', user_name, 30);
            setCookie('user_session', user_session, 30);
            $('#loginButton').text('Logout ' + user_name);
        }
        else {
            $('#loginButton').text('Sign in/Register');
        }
    }

    window.showLogin = function() {
        loginDefer = Q.defer();
        if(!user_id) {
            $('#loginModal').modal('show');
        }
        else {
            user_id = 0;
            user_name = null;
            user_session = null;
            clearCookie('user_session');
            clearCookie('user_username');
            clearCookie('user_userid');
            $('#loginButton').text('Sign in/Register');
        }
        return loginDefer.promise;
    };

    function setCookie(name, value, days) {
        var expires;
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toGMTString();
        } else {
            expires = '';
        }
        document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + expires + '; path=/';
    }

    // returns cookie value if it exists or defaultValue (or null if no defaultValue supplied)
    function getCookie(name, defaultValue) {
        var nameEQ = encodeURIComponent(name) + '=',
            ca = document.cookie.split(';'),
            i, c ;
        for (i = 0; i < ca.length; i++) {
            c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
        return defaultValue || null;
    }

    function clearCookie(name) {
        setCookie(name, '', -1);
    }

    function execute(source, args, request) {
        var iframe = document.getElementById('gameFrame');
        clearError();
        window.GameSource = preScript + source + postScript;
        iframe.src = '/static/frame.html';
        iframe.contentWindow.focus();
    }

    window.runit = function() {
        execute(editor.getValue());
    };

    function doSave() {
        var defer = Q.defer(),
            data =  { user_id: user_id, source: editor.getValue(), name: $("#gameName").val() };
        if(user_id !== 0) {
            console.log(data);
            post('/api/save', data, 'Saving ' + data.name, '', 'Error saving ' + data.name)
            .then(function(result) {
                reportStatus("Saved " + data.name + " OK\n");
                refreshGameList();
                defer.resolve();
            },
            function(xhr) {
                reportError("Error saving: " + xhr.status + " " + xhr.statusText);
                defer.reject();
            });
        }
        else {
            defer.reject();
        }
        return defer.promise;
    }

    window.saveit = function() {
        var n = $('#gameName').val(),
            source = editor.getValue();
        window.localStorage.setItem('source', source);
        console.log('[' +  n + ']');
        if(n !== '') {
            loginAnd().then(doSave);
        }
        else {
            showAlert('No name', 'You need to give your game a name!')
            .then(function(){
                $("#gameName").focus();
            });
        }
    };

    window.createNewGame = function() {
        // clear the name (and check it's not empty when they try to save)
        // make the editor empty
        // make the editor writeable etc
        editor.setValue('', -1);
        editor.setOptions({ readOnly: false, highlightActiveLine: true });
        enableKeyBindings();
        show('#saveButton', true);
        editor.session.getUndoManager().reset();
        $('#gameName').val('');
        enable('#gameName', true);
        showPane('editorPane');
    };

    $('#editor').click(function() {
        focusEditor();
    });

    editor = ace.edit("editor");
    editor.$blockScrolling = Infinity;
    source = localStorage.getItem('source');
    if(!source) {
        source = '// Catch the bright ones\n\nvar ship = {\n        x: 0,\n        y: 6,\n        color: 1,\n        glow: 0,\n        flash: 0,\n        speed: 0.25\n    },\n    time,\n    delay,\n    ticks,\n    frame,\n    state,\n    score,\n    dots;\n\nreset();\n\nfunction reset() {\n    time = 0;\n    delay = 10;\n    ticks = 0;\n    score = 0;\n    dots = [];\n    ship.speed = 0.25;\n    ship.flash = 0;\n    setState(playing);\n}\n\nfunction setState(s) {\n    state = s;\n    frame = 0;\n}\n\nfunction update() {\n    state();\n    time = ++time % delay;\n    if(time === 0) {\n        ++ticks;\n    }\n    ++frame;\n}\n\nfunction movePlayer() {\n    ship.x += (held("left") ? -ship.speed : 0) + (held("right") ? ship.speed : 0);\n    if(ship.x < 0) { ship.x = 0; }\n    if(ship.x > 6) { ship.x = 6; }\n}\n\nfunction moveDots() {\n    var i;\n    if(time === 0) {\n        for(i = 0; i < dots.length; ++i) {\n            dots[i].y += 1;\n            if(dots[i].y > 7)\n            {\n                dots.pop();\n            }\n        }\n        if((ticks % 5) === 0) {\n            dots.unshift({ x: (Math.random() * 8) >>> 0, y: 0, c: Math.random() > 0.8 ? 6 : 4 });\n        }\n    }\n}\n\nfunction checkCollision() {\n    var i,\n        dx,\n        px;\n    if(dots.length > 0) {\n        i = dots[dots.length - 1];\n        dx = i.x >>> 0;\n        px = ship.x >>> 0;\n        if(dx >= px && dx < px + 2 && i.y >= 6) {\n            if(i.c === 4) {\n                ship.flash = 30;\n                setState(dead);\n            }\n            else {\n                ship.speed += 0.05;\n                delay = Math.max(1, delay - 1);\n                dots.pop();\n                ++score;\n                ship.glow = 10;\n                ship.color = 2;\n            }\n        }\n    }\n}\n\nfunction drawScore() {\n    var i;\n    for(i=0; i<score; ++i) {\n        set(i, 7, 5);\n    }\n}\n\nfunction drawPlayer() {\n    var dx = ship.x >>> 0;\n    if(--ship.glow === 0) { ship.color = 1; }\n    if(ship.flash === 0 || --ship.flash / 4 % 1 !== 0) {\n        set(dx, ship.y, ship.color);\n        set(dx + 1, ship.y, ship.color);\n        set(dx, ship.y + 1, ship.color);\n        set(dx + 1, ship.y + 1, ship.color);\n    }\n}\n\nfunction drawDots() {\n    var i;\n    for(i = 0; i < dots.length; ++i) {\n        if(get(dots[i].x, dots[i].y) !== 5) {\n            set(dots[i].x, dots[i].y, dots[i].c);\n        }\n    }\n}\n\nfunction draw() {\n    clear();\n    drawScore();\n    drawPlayer();\n    drawDots();\n}\n\nfunction dead() {\n    draw();\n    if(frame > 30) {\n        reset();\n    }\n}\n\nfunction playing() {\n    movePlayer();\n    moveDots();\n    checkCollision();\n    draw();\n}\n';
    }
    editor.setValue(source, -1);
    editor.setShowPrintMargin(false);
    editor.setShowFoldWidgets(false);
    editor.getSession().setMode('ace/mode/javascript');
    editor.setOptions({
        enableLiveAutocompletion: true
    });
    editor.session.getUndoManager().reset();

    $('#gameName').bind('keypress', function (event) {
        var regex = new RegExp("^[\'\:\;\! \?\.\,a-zA-Z0-9]+$");
        var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
        if (!regex.test(key)) {
           event.preventDefault();
           return false;
        }
    });

    function enableKeyBindings() {
        editor.commands.addCommand({
            name:'save',
            bindKey: {
                win: 'Ctrl-S',
                mac: 'Command-S',
                sender: 'editor|cli'
            },
            exec: saveit
            });

        editor.commands.addCommand({
            name:'run',
            bindKey: {
                win: 'Ctrl-R',
                mac: 'Command-R',
                sender: 'editor|cli'
            },
            exec: runit
        });
    }

    function disableKeyBindings() {
        editor.commands.commmandKeyBinding = {};
    }
    user_id = 0;

    $('#loginForm').validate();

//    $('#registerForm').validate();

    panestack.push('gameList');
    showPane('gameList', false);

    function validateSession() {
        user_session = getCookie('user_session');
        user_id = parseInt(getCookie('user_userid'));
        user_name = getCookie('user_username');
        reportStatus('Logging in...');
        if(user_session && user_id && user_name) {
            get('/api/refreshSession', {
                user_session: user_session,
                user_id: user_id,
                user_name: user_name
            })
            .then(function(result) {
                user_id = parseInt(result.user_id);
                user_session = result.user_session;
                user_name = result.user_username;
                setCookie('user_userid', user_id, 30);
                setCookie('user_username', user_name, 30);
                setCookie('user_session', user_session, 30);
                reportStatus("Welcome back " + user_name);
            },
            function(xhr) {
                reportStatus('Session expired, please log in again...');
                clearCookie('user_userid');
                clearCookie('user_username');
                clearCookie('user_session');
            });
        }
        showRegistrationInfo();
        refreshGameList();
    }

    validateSession();
});
