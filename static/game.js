//////////////////////////////////////////////////////////////////////
// - game list
//      differentiate between my games and others
//      forking
// - browser history
// - make main left pane fill available screen space (esp. editor)
// - user registration/login/forgot password
//      username, verify password etc
//      Promise from login for what happens after (save, copy)
// - voting/rating/comments
// - telemetry/analytics
// - finish help pane content
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
//////////////////////////////////////////////////////////////////////

$(document).ready(function() {
    'use strict';

    var editor,
        user_id = 0,
        panes = [ 'gameList', 'editorPane', 'helpPane' ],
        paneNames = [ 'Games', 'Editor', 'Help' ],
        panestack = [],
        loginDefer,
        choiceDefer,
        source;

    var preScript = 'function ClientScript(document, window, alert, parent, frames, frameElment, history, fullScreen, innerHeight, innerWidth, length, location, GlobalEventHandlers, WindowEventHandlers, opener, performance, screen) { "use strict"; ';
    var postScript = '; this.updateFunction = (typeof update === "function") ? update : null; };';

    function getFormObj(formId) {
        var formObj = {};
        var inputs = $('#'+formId).serializeArray();
        $.each(inputs, function (i, input) {
            formObj[input.name] = input.value;
        });
        return formObj;
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
            $.post('/delete', {
                user_id: user_id,
                game_id: gameID})
            .done(function(result) {
                refreshGameList();
                reportStatus('Game deleted');
            })
            .fail(function(xhr){
                reportError(xhr.statusText);
            });
        },
        function() {
            console.log('No!');
        });
    };

    window.viewIt = function(gameID) {

    };

    window.playIt = function(gameID) {
        $.get('/source', {game_id: gameID})
        .done(function(result)
        {
            execute(result.source);
        })
        .fail(function(xhr)
        {
            reportError(xhr.statusText);
        });
    };

    window.EditIt = function(game_id) {
        $.get('/source', {game_id: game_id})
        .done(function(result) {
            console.log(result);
            editor.session.getUndoManager().reset();
            editor.setValue(result.source, -1);
            $('#gameName').val(result.game_title);
            showPane('editorPane');
        })
        .fail(function(xhr) {
            reportError(xhr.statusText);
        });
    };

    function getChoice(banner, text, yesText, noText) {
        choiceDefer = Q.defer();
        $('#choiceText').text(text);
        $('#choiceLabel').text(banner || '');
        $('#choiceYes').text(yesText || 'Yes');
        $('#choiceNo').text(noText || 'No');
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
                    $('#closeButton').removeClass('masked');
                }
                p.removeClass('masked');
                $('#paneTitle').text(paneNames[i]);
            }
            else {
                p.addClass('masked');
            }
        }
    };

    window.popPane = function() {
        if(panestack.length > 1) {
            panestack.pop();
            showPane(panestack[panestack.length - 1], false);
            if(panestack.length === 1) {
                $('#closeButton').addClass('masked');
            }
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
        sb.html(e);
        sb.removeClass('statusError');
        focusEditor();
    };

    window.reportError = function(e) {
        var sb = $('#statusBar');
        sb.html(e);
        sb.addClass('statusError');
        focusEditor();
    };

    function doLogin() {
        $.post('/login', getFormObj('loginForm'))
        .done(function(result) {
            user_id = result.user_id;
            $('#loginModal').modal('hide');
            $('#loginButton').text('Logout');
            loginDefer.resolve();
        })
        .fail(function(xhr) {
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
            refreshGameList();
        });
        return false;
    };

    window.handleRegister = function(e) {
        $('#registerMessage').text('');
        var data = getFormObj('registerForm');
        console.log(data);
        $.post('/register', data)
        .done(function(result) {
            console.log(result);
            if(result.status !== 'ok') {
                $('#registerMessage').html(result.message);
                $('#registerMessage').show();
            } else {
                // success - should be a user_id in there
                user_id = result.user_id;
            }
        })
        .fail(function(xhr) {
            $('#registerMessage').html(xhr.statusText);
            $('#registerMessage').show();
        });
        return false;
    };

    function format(str, col) {
        col = typeof col === 'object' ? col : Array.prototype.slice.call(arguments, 1);
        return str.replace(/\{\{|\}\}|\{(\w+)\}/g, function (m, n) {
            if (m == '{{') { return '{'; }
            if (m == '}}') { return '}'; }
            return col[n];
        });
    }

    function row(index, g) {

        var template =
            "<tr data-toggle='collapse' data-target='#row{index}' class='clickable' id='headerRow{index}' aria-expandable='true'>" +
                "<td>" +
                    "{game_title}" +
                "</td>" +
                "<td>" +
                    "{user}" +
                "</td>" +
            "</tr>" +
            "<tr class='hid'>" +
                "<td colspan='2'>" +
                    "<div class='accordion-body collapse tableContainer' id='row{index}' row='#headerRow{index}' collapsible aria-expanded='false' style>" +
                        "<table class='table inner'>" +
                            "<tbody>" +
                                "<tr>" +
                                    "<td colspan='2' class='butter'>" +
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
            params = {
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
        $.get('/list', {
                user_id: 1
            })
        .done(function(result) {
            for(i in result.games) {
                table += row(i, result.games[i]);
            }
            $('#results').html(table);
        })
        .fail(function(xhr) {
            setStatus(xhr.statusText);
        });
    };

    window.showRegistration = function() {
        $('#loginModal').modal('hide');
        $('#registerModal').modal('show');
    };

    window.showLogin = function() {
        loginDefer = Q.defer();
        if(user_id === 0) {
            $('#loginModal').modal('show');
        }
        else {
            user_id = 0;
            $('#loginButton').text('Sign in/Register');
        }
        return loginDefer.promise;
    };

    function createCookie(name, value, days) {
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

    function readCookie(name) {
        var nameEQ = encodeURIComponent(name) + '=';
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
    }

    function eraseCookie(name) {
        createCookie(name, '', -1);
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
            $.post('/save', data)
            .done(function(result) {
                reportStatus("Saved " + data.name + " OK\n");
                editor.session.getUndoManager().reset();
                $('#saveButton').attr('disabled');
                refreshGameList();
                defer.resolve();
            })
            .fail(function(xhr) {
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
        var source = editor.getValue();
        window.localStorage.setItem('source', source);
        loginAnd().then(doSave);
    };

    window.createNewGame = function() {
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
    $('#saveButton').attr('disabled');

    $('#gameName').bind('keypress', function (event) {
        var regex = new RegExp("^[\'\:\;\! \?\.\,a-zA-Z0-9]+$");
        var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
        if (!regex.test(key)) {
           event.preventDefault();
           return false;
        }
    });

    // editor.on('input', function() {
    //     if(editor.session.getUndoManager().hasUndo()) {
    //         console.log('Disabling');
    //         $('#saveButton').removeAttr('disabled');
    //     }
    //     else {
    //         $('#saveButton').attr('disabled');
    //         console.log('Enabling');
    //     }
    // });

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
        exec: execute
    });

    user_id = 0;

    $('#loginForm').validate();

//    $('#registerForm').validate();

    panestack.push('gameList');
    showPane('gameList', false);

    refreshGameList();

//    focusEditor();

});
