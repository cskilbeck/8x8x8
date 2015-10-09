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
        animFrameID = [],
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

    window.eng = {
        setpixel: function(x, y, color) {
            x >>>= 0;
            y >>>= 0;
            if(typeof color === 'string') {
                color = colorTable[color] || 0;
            }
            if(x >= 0 && x < W && y >= 0 && y < H) {
                screen[x + y * W] = (color|0) & 15;
            }
        },
        getpixel: function(x, y) {
            return colorNames[eng.getpixeli(x, y) || 0];
        },
        getpixeli: function(x, y) {
            x >>>= 0;
            y >>>= 0;
            if(x >= 0 && x < W && y >= 0 && y < H) {
                return screen[x + y * W] || 0;
            }
            return 0;
        },
        keypress: function() {
            if(lastKeyPressed === undefined) {
                lastKeyPressed = keyPress.shift();
            }
            return keyNameFromCode(lastKeyPressed);
        },
        keyheld: function(key) {
            return getKey(keyCodeFromName(key), keyHeld);
        },
        keyrelease: function() {
            if(lastKeyReleased === undefined) {
                lastKeyReleased = keyPress.shift();
            }
            return keyNameFromCode(lastKeyReleased);
        },
        reset: function() {
            resetRequest = true;
        },
        clear: function(color) {
            var i;
            if(typeof color === 'string') {
                color = colorTable[color] || 0;
            }
            for(i=0; i<W*H; ++i) {
                screen[i] = color || 0;
            }
        },
        onframe: function() {
            eng.ctr = 0;
            if(resetRequest) {
                eng.restart();
                resetRequest = false;
            }
            if(eng.updateFunction && eng.cont) {
                if(step || ((frame % frameDelay) === 0 && !paused)) {
                    eng.updateFunction(frameCounter++);
                    eng.endframe();
                }
                if(step || !paused) {
                    ++frame;
                }
                step = false;
            }
            eng.drawScreen();
            startAnim();
        },
        drawScreen: function() {
            mainApp.draw(canvas, context, screen, W, H);
        },
        fail: function(err) {
            eng.cont = false;
            postMessage('error', err);
            // var errWrapper = new Error('[__reported__] ' + err.message);
            // errWrapper.error = err;
            // throw errWrapper;
            throw err;
        },
        catchErrors: function(f) {
            var self = this;
            return function() {
                if (self.errorHandler) {
                    return f.apply(this, arguments);
                }
                self.errorHandler = true;
                try {
                    var res = f.apply(this, arguments);
                    self.errorHandler = false;
                    return res;
                } catch (err) {
                    self.errorHandler = false;
                    self.fail(err);
                    throw new Error("Unreachable");
                }
            };
        },
        endframe: function() {
            var i;
            lastKeyReleased = undefined;
            lastKeyPressed = undefined;
            for(i in keyHeldReal) {
                keyHeld[i] = keyHeldReal[i];
            }
        },
        restart: function() {
            eng.cont = true;
            eng.ctr = 0;
            eng.maxctr = 30000;
            eng.errorHandler = false;

            keyPress = [];
            keyRelease = [];
            keyHeld = [ false, false, false, false, false ];
            keyHeldReal  = [ false, false, false, false, false ];
            keyCount = 0;
            lastkey = 0;
            frame = 0;
            frameCounter = 0;
            eng.clear();

            if(typeof eng.userFunction === 'function') {
                eng.userFunction();
            }
            startAnim();
        },
        clientFunction: null,
        userFunction: null,
        updateFunction: null,

        cont: true,
        ctr: 0,
        maxctr: 30000,
        errorHandler: false
    };

    function startAnim() {
        var id;
        while(animFrameID.length > 0) {
            id = animFrameID.pop();
            cancelAnimationFrame(id);
        }
        animFrameID.push(requestAnimationFrame(eng.onframe));
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

    // Allow anyone, anywhere to send us some script which we will blindly execute!
    // But we're running sandboxed, so network should be secure...

    function setup(data) {
        var oldScript = document.getElementById('clientscript'),
            newScript = document.createElement('script'),
            body = document.getElementsByTagName('body')[0];
        if(oldScript) {
            body.removeChild(oldScript);
        }
        newScript.setAttribute('id', 'clientscript');
        newScript.innerHTML = data;
        body.appendChild(newScript);    // it runs here!
        eng.clientFunction(eng);
        if(eng.userFunction) {
            eng.restart();
        }
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
                    resetRequest = true;
                    break;
                case 'step':
                    step = true;
                    paused = true;
                    break;
                case 'is-paused':
                    postMessage('paused', paused);
                    break;
                case 'clear-exception':
                    //reset();
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
            // Bad JSON in the message
        }
    });

    startAnim();

}());
