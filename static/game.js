//////////////////////////////////////////////////////////////////////
// - user registration/login/forgot password
// - web service
// - voting
// - telemetry/analytics
// - feedback on save/execute
// - form validation (jquery.validate) + bootstrap popover: http://jsfiddle.net/3qYpM/609/
//
// + save current source in LocalStorage
//
//
// when the email changes, and it's a valid email, ajax it to the server
// when the result comes back, if it's a known user, then the hash will accompany and can be checked against the password
// if it's not a known user, change button text to 'Register' and send username + password to server for hashing
//
// 23456789abcdfghjklmnpqrstvwxz
//
//////////////////////////////////////////////////////////////////////
// function: set(x, y, c) - set pixel at x,y to color c
// function: get(x, y) - get the color of the pixel at x,y
// function: clear(c) - set the whole screen to color c (default: 0)
//
//      coordinates: 0,0 is top left, 7,7 is bottom right
//      colors: {0: black, 1: red, 2: green, 3: yellow, 4: blue, 5: magenta, 6: cyan, 7: white}
//
// function: held(k) - get whether key k is currently held down
// function: pressed(k) - get whether key k was just pressed
// function: released(k) - get whether key k was just released
//
//      keys: ['up', 'down', 'left', 'right', 'space']
//
// function update() will be called each frame

$(document).ready(function() {
    "option strict";

    var editor,
        user_id,
        panes = [ 'gameList', 'editorPane', 'helpPane' ],
        paneNames = [ 'Games', 'Editor', 'Help' ],
        panestack = [],
        source;

    showPane = function(name, push) {
        var i, p;
        for(i in panes) {
            p = $('#' + panes[i]);
            if(name === panes[i]) {
                if(p.hasClass('masked') && push !== false) {
                    panestack.push(i);
                }
                p.removeClass('masked');
                $("#closeButton").removeClass('masked');
                $("#paneTitle").text(paneNames[i]);
            }
            else {
                p.addClass('masked');
            }
        }
    };

    popPane = function() {
        if(panestack.length > 1) {
            panestack.pop();
            showPane(panestack[panestack.length - 1], false);
            if(panestack.length === 1) {
                $("#closeButton").addClass('masked');
            }
        }
    };

    clearError = function(e) {
        $("#statusBar").html("&nbsp;");
    };

    FocusEditor = function() {
        focus();
        editor.focus();
    };

    reportError = function(e) {
        $("#statusBar").html(e);
        FocusEditor();
    };

    handleLogin = function(e) {
        $.post('/login', {
                email: $('#emailInput').val(),
                password: $("#passwordInput").val()
            })
        .done(function(result) {
            console.log(result);
            user_id = result.user_id;
            $("#loginModal").modal('hide');
            $("#loginButton").text("Logout");
        })
        .fail(function(xhr) {
            if(xhr.status === 401) {
                $("#loginMessage").show();
            }
        });
        return false;
    };

    showLogin = function() {
        if(user_id === 0) {
            $("#loginModal").modal('show');
        }
        else {
            user_id = 0;
            $("#loginButton").text("Sign in/Register");
        }
    };

    function createCookie(name, value, days) {
        var expires;
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toGMTString();
        } else {
            expires = "";
        }
        document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + expires + "; path=/";
    }

    function readCookie(name) {
        var nameEQ = encodeURIComponent(name) + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
    }

    function eraseCookie(name) {
        createCookie(name, "", -1);
    }

    function execute(editor, args, request) {
        var iframe = document.getElementById('gameFrame');
        clearError();
        GameSource = editor.getValue();
        iframe.src = '/static/frame.html';
        iframe.contentWindow.focus();
    }

    runit = function() {
        execute(editor);
    };

    saveit = function() {
        var source = editor.getValue(),
            data =  { user_id: user_id, source: source, name: $("#gameName").val() };
        window.localStorage.setItem('source', source);
        if(user_id !== 0) {
            console.log(data);
            $.post('/save', data)
            .done(function(result) {
                console.log("Saved OK\n");
            })
            .fail(function(xhr) {
                console.log("Error saving: " + xhr.status + " " + xhr.statusText);
            });
        }
        else {
            $("#loginModal").modal('show');
        }
        editor.session.getUndoManager().reset();
        $('#saveButton').attr('disabled');
    };

    $('#editor').click(function() {
        FocusEditor();
    });

    editor = ace.edit("editor");
    editor.$blockScrolling = Infinity;
    source = localStorage.getItem('source');
    if(!source) {
        source = "// Catch the bright ones\n\nvar ship = {\n        x: 0,\n        y: 6,\n        color: 1,\n        glow: 0,\n        flash: 0,\n        speed: 0.25\n    },\n    time,\n    delay,\n    ticks,\n    frame,\n    state,\n    score,\n    dots;\n\nreset();\n\nfunction reset() {\n    time = 0;\n    delay = 10;\n    ticks = 0;\n    score = 0;\n    dots = [];\n    ship.speed = 0.25;\n    ship.flash = 0;\n    setState(playing);\n}\n\nfunction setState(s) {\n    state = s;\n    frame = 0;\n}\n\nfunction update() {\n    state();\n    time = ++time % delay;\n    if(time === 0) {\n        ++ticks;\n    }\n    ++frame;\n}\n\nfunction movePlayer() {\n    ship.x += (held('left') ? -ship.speed : 0) + (held('right') ? ship.speed : 0);\n    if(ship.x < 0) { ship.x = 0; }\n    if(ship.x > 6) { ship.x = 6; }\n}\n\nfunction moveDots() {\n    var i;\n    if(time === 0) {\n        for(i = 0; i < dots.length; ++i) {\n            dots[i].y += 1;\n            if(dots[i].y > 7)\n            {\n                dots.pop();\n            }\n        }\n        if((ticks % 5) === 0) {\n            dots.unshift({ x: (Math.random() * 8) >>> 0, y: 0, c: Math.random() > 0.8 ? 6 : 4 });\n        }\n    }\n}\n\nfunction checkCollision() {\n    var i,\n        dx,\n        px;\n    if(dots.length > 0) {\n        i = dots[dots.length - 1];\n        dx = i.x >>> 0;\n        px = ship.x >>> 0;\n        if(dx >= px && dx < px + 2 && i.y >= 6) {\n            if(i.c === 4) {\n                ship.flash = 30;\n                setState(dead);\n            }\n            else {\n                ship.speed += 0.05;\n                delay = Math.max(1, delay - 1);\n                dots.pop();\n                ++score;\n                ship.glow = 10;\n                ship.color = 2;\n            }\n        }\n    }\n}\n\nfunction drawScore() {\n    var i;\n    for(i=0; i<score; ++i) {\n        set(i, 7, 5);\n    }\n}\n\nfunction drawPlayer() {\n    var dx = ship.x >>> 0;\n    if(--ship.glow === 0) { ship.color = 1; }\n    if(ship.flash === 0 || --ship.flash / 4 % 1 !== 0) {\n        set(dx, ship.y, ship.color);\n        set(dx + 1, ship.y, ship.color);\n        set(dx, ship.y + 1, ship.color);\n        set(dx + 1, ship.y + 1, ship.color);\n    }\n}\n\nfunction drawDots() {\n    var i;\n    for(i = 0; i < dots.length; ++i) {\n        if(get(dots[i].x, dots[i].y) !== 5) {\n            set(dots[i].x, dots[i].y, dots[i].c);\n        }\n    }\n}\n\nfunction draw() {\n    clear();\n    drawScore();\n    drawPlayer();\n    drawDots();\n}\n\nfunction dead() {\n    draw();\n    if(frame > 30) {\n        reset();\n    }\n}\n\nfunction playing() {\n    movePlayer();\n    moveDots();\n    checkCollision();\n    draw();\n}\n";
    }
    editor.setValue(source, -1);
    editor.setShowPrintMargin(false);
    editor.setShowFoldWidgets(false);
    editor.getSession().setMode("ace/mode/javascript");
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
    //         console.log("Disabling");
    //         $('#saveButton').removeAttr('disabled');
    //     }
    //     else {
    //         $('#saveButton').attr('disabled');
    //         console.log("Enabling");
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

    $("#loginForm").validate();

    panestack.push('editorPane');
    showPane('editorPane');
    
    editor.resize(true);

    FocusEditor();

});
