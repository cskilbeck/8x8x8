(function() {
    "use strict";

    var lastTime = 0,
        vendors = [
        "moz",
        "ms",
        "o",
        "webkit" ],
        x;
    for(x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime(),
                timeToCall = Math.max(0, 16 - (currTime - lastTime)),
                id = window.setTimeout(function() {
                        callback(currTime + timeToCall);
                    }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());

Object.defineProperty(Error.prototype, 'toJSON', {
    value: function () {
        var alt = {};
        Object.getOwnPropertyNames(this).forEach(function (key) {
            alt[key] = this[key];
        }, this);
        return alt;
    },
    configurable: true
});

(function() {
    "use strict";

    var W = 16, H = 16,
        context, canvas,
        paused = false, step = false,
        client,
        resetRequest,
        lastKeyPressed,
        lastKeyReleased,
        keyPress = [], keyRelease = [],
        keys = [32, 37, 38, 39, 40],
        keyHeld = [ false, false, false, false, false ],
        keyHeldReal  = [ false, false, false, false, false ],
        exception = false,
        keyCount = 0, lastkey,
        frame = 0, frameCounter = 0, frameDelay = 1,
        keynames = ['space', 'left', 'up', 'right', 'down'],
        colorTable = {
            black: 0,
            darkgreen: 1,
            green: 2,
            lightgreen: 3,
            darkred: 4,
            red: 5,
            lightred: 6,
            darkblue: 7,
            blue: 8,
            lightblue: 9,
            purple: 10,
            magenta: 11,
            pink: 12,
            orange: 13,
            yellow: 14,
            white: 15
        },
        colorNames = [
            "black",
            "darkgreen",
            "green",
            "lightgreen",
            "darkred",
            "red",
            "lightred",
            "darkblue",
            "blue",
            "lightblue",
            "purple",
            "magenta",
            "pink",
            "orange",
            "yellow",
            "white"
        ],
        screen = [];

    function resetIt() {
        client = null;
        resetRequest = false;
        screen = [];
        keyPress = [];
        keyRelease = [];
        keyHeld = [ false, false, false, false, false ];
        keyHeldReal  = [ false, false, false, false, false ];
        exception = false;
        keyCount = 0;
        lastkey = 0;
        frame = 0;
        frameCounter = 0;
    }

    function doReset() {
        resetRequest = true;
    }

    function drawScreen() {
        mainApp.draw(canvas, context, screen, W, H);
    }

    function doSet(x, y, color) {
        x >>>= 0;
        y >>>= 0;
        if(typeof color === 'string') {
            color = colorTable[color] || 0;
        }
        if(x >= 0 && x < W && y >= 0 && y < H) {
            screen[x + y * W] = (color|0) & 15;
        }
    }

    function doGet(x, y) {
        x >>>= 0;
        y >>>= 0;
        if(x >= 0 && x < W && y >= 0 && y < H) {
            return screen[x + y * W] || 0;
        }
        return 0;
    }

    function doGetColor(x, y) {
        return colorNames[doGet(x, y) || 0];
    }

    function doClear(color) {
        var i;
        if(typeof color === 'string') {
            color = colorTable[color] || 0;
        }
        for(i=0; i<W*H; ++i) {
            screen[i] = color || 0;
        }
    }

    function keyCodeFromName(str) {
        return keynames.indexOf(str.toLowerCase());
    }

    function keyNameFromCode(code) {
        return keynames[code];
    }

    function getKey(code, arr) {
        return (code >= 0 && code <= arr.length) ? arr[code] : false;
    }

    // TODO (chs): make keypressed() return same value until new frame fires
    function doPressed() {
        if(lastKeyPressed === undefined) {
            lastKeyPressed = keyPress.shift();
        }
        return keyNameFromCode(lastKeyPressed);
    }

    function doReleased(key) {
        if(lastKeyReleased === undefined) {
            lastKeyReleased = keyPress.shift();
        }
        return keyNameFromCode(lastKeyReleased);
    }

    function doHeld(key) {
        return getKey(keyCodeFromName(key), keyHeld);
    }

    function getKeyCode(key) {
        if(key == 32)
        {
            return 0;
        }
        else if(key >= 37 && key <= 40)
        {
            return key - 36;
        }
        return null;
    }

    function postMessage(message, data) {
        if(parent && parent.window) {
            parent.window.postMessage(JSON.stringify({ message: message, data: data }), "https://256pixels.net");
        }
    }

    function focusEditor() {
        postMessage('focus-editor');
    }

    document.onkeydown = function(e) {
        var key;
        if(e.keyCode === 27) {
            focusEditor();
        }
        if(keyCount > 0 && e.keyCode === lastkey) {
        }
        else
        {
            lastkey = e.keyCode;
            key = getKeyCode(e.keyCode);
            if(key !== null) {
                if(keyPress.length >= 20) {
                    keyPress.shift();
                }
                keyPress.push(key);
                keyHeld[key] = true;
                keyHeldReal[key] = true;
            }
        }
        ++keyCount;
        if(keys.indexOf(e.keyCode) >= 0) {
            e.preventDefault();
        }
    };

    document.onkeyup = function(e) {
        var key = getKeyCode(e.keyCode);
        keyCount = lastkey = 0;
        if(key !== null) {
            if(keyRelease.length >= 20) {
                keyRelease.shift();
            }
            keyRelease.push(key);
            keyHeldReal[key] = false;
        }
        if(keys.indexOf(e.keyCode) >= 0) {
            e.preventDefault();
        }
    };

    function onFrame() {
        var i, hasUpdate;
        if(resetRequest) {
            startIt();
        }
        if(client && client.$updateFunction && !exception) {
            hasUpdate = true;
            if(step || ((frame % frameDelay) === 0 && !paused)) {
                try {
                    client.$updateFunction(frameCounter++);
                }
                catch(e) {
                    exception = true;
                    reportError(e);
                }
                lastKeyReleased = undefined;
                lastKeyPressed = undefined;
                for(i in keyHeldReal) {
                    keyHeld[i] = keyHeldReal[i];
                }
            }
            if(step || !paused) {
                ++frame;
            }
            step = false;
            drawScreen();
        }
        else {
            focusEditor();
        }
        requestAnimationFrame(onFrame);
    }

    function reportError(e) {
        postMessage('error', e);
    }

    function reportErrorDirect(msg, line, column) {
        postMessage('error-direct', {
                    msg: msg,
                    line: line,
                    column: column
                });
    }

    window.onerror = function(message, file, line, column) {
        reportErrorDirect(message, line, column);
        exception = true;
    };

    window.onload = function() {
        postMessage('frame-loaded');
    };

    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    window.setpixel = function(x, y, c) { return doSet(x, y, c); };
    window.getpixel = function(x, y) { return doGetColor(x, y); };
    window.getpixeli = function(x, y) { return doGet(x, y); };
    window.clear = function(c) { return doClear(c); };
    window.keyheld = function(k) { return doHeld(k); };
    window.keypress = function(k) { return doPressed(k); };
    window.keyrelease = function(k) { return doReleased(k); };
    window.reset = function() { return doReset(); };

    function startIt() {
        resetIt();
        try {
            client = (ClientScript !== undefined) ? new ClientScript() : null;
        }
        catch(e) {
            reportError(e);
        }
        drawScreen();
    }

    // Allow anyone, anywhere to send us some script which we will blindly execute!
    // Check origin!

    function setup(data) {
        var oldScript = document.getElementById('clientscript'),
            newScript = document.createElement('script'),
            body = document.getElementsByTagName('body')[0];
        body.removeChild(oldScript);
        newScript.setAttribute('id', 'clientscript');
        newScript.innerHTML = data;
        body.appendChild(newScript);
    }

    window.addEventListener('message', function(e) {
        var payload, message, data;
        try {
            payload = JSON.parse(e.data);
            message = payload.message;
            data = payload.data;
            switch(message) {
                case 'set-frame-delay':
                    frameDelay = data;
                    break;
                case 'toggle-pause':
                    paused = !paused;
                    postMessage('paused', paused);
                    break;
                case 'unpause':
                    paused = false;
                    postMessage('paused', paused);
                    break;
                case 'restart':
                    step = true;
                    startIt();
                    break;
                case 'step':
                    step = true;
                    paused = true;
                    break;
                case 'is-paused':
                    break;
                case 'clear-exception':
                    reset();
                    break;
                case 'screenshot':
                    postMessage('screenshot', screen);
                    break;
                case 'source':
                    setup(data);
                    break;
            }
        }
        catch(SyntaxError) {

        }
    });

    if(window.game && window.game.frameDelay !== undefined) {
        frameDelay = window.game.frameDelay;
        console.log("game.frameDelay =", frameDelay);
    }

    drawScreen();
    startIt();
    requestAnimationFrame(onFrame);

}());
