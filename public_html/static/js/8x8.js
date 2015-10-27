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
        frame = 0, frameCounter = 0,
        keynames = ['space', 'left', 'up', 'right', 'down'],
        colorTable = {
            black: 0, darkgreen: 1, green: 2, lightgreen: 3,
            darkred: 4, red: 5, lightred: 6, darkblue: 7,
            blue: 8, lightblue: 9, purple: 10, magenta: 11,
            pink: 12, orange: 13, yellow: 14, white: 15
        },
        colorNames = [
            "black", "darkgreen", "green", "lightgreen",
            "darkred", "red", "lightred", "darkblue",
            "blue", "lightblue", "purple", "magenta",
            "pink", "orange", "yellow", "white"
        ],
        screen = [];

    function getColor(color) {
        if(typeof color === 'string') {
            color = colorTable[color] || 0;
        }
        return (color | 0) & 15;
    }

    function _setpixel(x,y, color) {
        screen[x + y * W] = color;
    }

    function _setpixel_safe(x, y, color) {
        if(x >= 0 && x < W && y >= 0 && y < H) {
            _setpixel(x, y, color);
        }
    }

    function _hline(x1, x2, y, color) {
        if(y >= 0 && y < H) {
            x1 = Math.max(0, x1);
            x2 = Math.min(W, x2);
            if(x1 < W && x2 >= 0) {
                for(; x1 < x2; ++x1) {
                    _setpixel(x1, y, color);
                }
            }
        }
    }

    function _vline(x, y1, y2, color) {
        if(x >= 0 && x < W) {
            y1 = Math.max(0, y1);
            y2 = Math.min(H, y2);
            if(y1 < H && y2 >= 0) {
                for(; y1 < y2; ++y1) {
                    _setpixel(x, y1, color);
                }
            }
        }
    }

    window.eng = {
        setpixel: function(x, y, color) {
            x = Math.floor(x);
            y = Math.floor(y);
            color = getColor(color);
            _setpixel_safe(x, y, color);
        },
        rectangle: function(x, y, w, h, color) {
            var v;
            x = Math.floor(x);
            y = Math.floor(y);
            color = getColor(color);
            if(x < 0) {
                w += x;
                x = 0;
            }
            if(y < 0) {
                h += y;
                y = 0;
            }
            if(w <= 0 || h <= 0) {
                return;
            }
            x = Math.min(W-1, x);
            y = Math.min(H-1, y);
            w = Math.min(W, x + w);
            h = Math.min(H, y + h);
            for(; y < h; ++y) {
                for(v = x; v < w; ++v) {
                    _setpixel(v, y, color);
                }
            }
        },
        box: function(x, y, w, h, color) {
            color = getColor(color);
            _hline(x, x + w, y, color);
            if(h > 1) {
                _hline(x, x + w, y + h - 1, color);
            }
            if(h > 2) {
                _vline(x, y + 1, y + h - 1, color);
                if(w > 1) {
                    _vline(x + w - 1, y + 1, y + h - 1, color);
                }
            }
        },
        line: function(x0, y0, x1, y1, c) { // the slowest line draw in history
            var dx, dy,
                sx, sy,
                err, e2;
            c = getColor(c);
            x0 = Math.floor(x0); x1 = Math.floor(x1);
            y0 = Math.floor(y0); y1 = Math.floor(y1);
            dx = Math.abs(x1 - x0);
            dy = Math.abs(y1 - y0);
            sx = x0 < x1 ? 1 : -1;
            sy = y0 < y1 ? 1 : -1;
            err = (dx > dy ? dx : -dy) / 2;
            while(true) {
                _setpixel_safe(x0,y0, c);
                if (x0 === x1 && y0 === y1) {
                    break;
                }
                e2 = err;
                if (e2 > -dx) {
                    err -= dy;
                    x0 += sx;
                }
                if (e2 < dy) {
                    err += dx;
                    y0 += sy;
                }
            }
        },
        getpixeli: function(x, y) {
            x = Math.floor(x);
            y = Math.floor(y);
            if(x >= 0 && x < W && y >= 0 && y < H) {
                return screen[x + y * W] || 0;
            }
            return 0;
        },
        getpixel: function(x, y) {
            return colorNames[eng.getpixeli(x, y)];
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
                if(step || ((frame % eng.frameDelay) === 0 && !paused)) {
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

        frameDelay: 1,
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
        if(window.self !== window.top) {
            if (!window.location.origin) {
              window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
            }
            parent.window.postMessage(JSON.stringify({ message: message, data: data }), window.location.origin);
        }
    }

    function focusEditor() {
        postMessage('focus-editor');
    }

    var keyMap = {
        tap: 32,
        left: 37,
        up: 38,
        right: 39,
        down: 40
    };

    function handleKeyPress(k) {
        var key = getKeyCode(k);
        lastkey = k;
        if(key !== null) {
            if(keyPress.length >= 20) {
                keyPress.shift();
            }
            keyPress.push(key);
            keyHeld[key] = true;
            keyHeldReal[key] = true;
        }
    }

    function handleKeyRelease(k) {
        var key = getKeyCode(k);
        if(key !== null) {
            if(keyRelease.length >= 20) {
                keyRelease.shift();
            }
            keyRelease.push(key);
            keyHeldReal[key] = false;
        }
    }

    document.onkeydown = function(e) {
        if(e.keyCode === 27) {
            focusEditor();
        }
        if(keyCount === 0 || e.keyCode !== lastkey) {
            handleKeyPress(e.keyCode);
        }
        ++keyCount;
        if(keys.indexOf(e.keyCode) >= 0) {
            e.preventDefault();
        }
    };

    document.onkeyup = function(e) {
        handleKeyRelease(e.keyCode);
        keyCount = lastkey = 0;
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

    touchEnable(canvas);

    window.addEventListener('message', function(e) {
        var payload, message, data;
        try {
            payload = JSON.parse(e.data);
            message = payload.message;
            data = payload.data;
            switch(message) {
                case 'set-frame-delay':
                    eng.frameDelay = data;
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
