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

(function() {
    "use strict";

    var W = 16, H = 16,
        CW, CH,
        animFrameID,
        context, canvas,
        paused = false, step = false,
        client,
        keyPress = [], keyRelease = [],
        keyHeld = [ false, false, false, false, false ],
        keyHeldReal  = [ false, false, false, false, false ],
        exception = false,
        keyCount = 0, lastkey,
        frame = 0, frameCounter = 0, frameDelay,
        colors = [
            '#000', // black
            '#080', // dark green
            '#0F0', // green
            '#8F8', // light green
            '#800', // dark red
            '#F00', // red
            '#F88', // light red
            '#008', // dark blue
            '#00F', // blue
            '#0FF', // lightblue
            '#808', // purple
            '#F0F', // magenta
            '#F8F', // pink
            '#F80', // orange
            '#FF0', // yellow
            '#FFF'  // white
        ],
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

    function reset() {
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

    function ellipse(ctx, cx, cy, w, h, rounded){
        var lx = cx - w,
            rx = cx + w,
            ty = cy - h,
            by = cy + h;
        var m = 0.551784 * (rounded || 1);
        var xm = m * w;
        var ym = h * m;
        ctx.beginPath();
        ctx.moveTo(cx, ty);
        ctx.bezierCurveTo(cx + xm, ty, rx, cy - ym, rx, cy);
        ctx.bezierCurveTo(rx, cy + ym, cx + xm, by, cx, by);
        ctx.bezierCurveTo(cx - xm, by, lx, cy + ym, lx, cy);
        ctx.bezierCurveTo(lx, cy - ym, cx - xm, ty, cx, ty);
    }

    function draw() {
        var x,
            y,
            xm = CW / W,
            ym = CH / H,
            xm2 = xm / 2,
            ym2 = ym / 2,
            i = 0;
        context.fillStyle = '#122';
        context.fillRect(0, 0, canvas.width, canvas.height);
        for(y = ym2; y < CH; y += ym) {
            for(x = xm2; x < CW; x += xm) {
                context.fillStyle = colors[screen[i++] & 15];
                context.globalAlpha = 0.8;
                ellipse(context, x, y, xm2 - 1, ym2 - 1, 1.75);
                context.fill();
                context.globalAlpha = 1.0;
                ellipse(context, x, y, xm2 - 2, ym2 - 2, 1.75);
                context.fill();
            }
        }
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
            return screen[x + y * W];
        }
        return 0;
    }

    function doGetColor(x, y) {
        return colorNames[doGet(x, y)];
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
        switch(str.toLowerCase()) {
            case ' ': return 0;
            case 'space' : return 0;
            case 'left': return 1;
            case 'up': return 2;
            case 'right': return 3;
            case 'down': return 4;
            default: return -1;
        }
    }

    function keyNameFromCode(code) {
        if(code >= 0 && code <= 4) {
            return ['space', 'left', 'up', 'right', 'down'][code];
        }
        else
        {
            return '?';
        }
    }

    function getKey(code, arr) {
        return (code >= 0 && code <= arr.length) ? arr[code] : false;
    }

    function doPressed() {
        var k = keyPress.shift();
        return k !== undefined ? keyNameFromCode(k) : false;
    }

    function doHeld(key) {
        return getKey(keyCodeFromName(key), keyHeld);
    }

    function doReleased(key) {
        var k = keyRelease.shift();
        return k ? keyNameFromCode(k) : '';
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

    function focusEditor() {
        if(parent.window && typeof parent.window.focusEditor === 'function') {
            parent.window.focusEditor();
        }
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
        if(e.keyCode in [32, 37, 38, 39, 40]) {
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
        if(e.keyCode in [32, 37, 38, 39, 40]) {
            e.preventDefault();
        }
    };

    function onFrame() {
        var i, hasUpdate;
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
                for(i in keyHeldReal) {
                    keyHeld[i] = keyHeldReal[i];
                }
            }
            if(step || !paused) {
                ++frame;
            }
            step = false;
            draw();
        }
        if(hasUpdate) {
            animFrameID = requestAnimationFrame(onFrame);
        }
        else {
            focusEditor();
        }
    }

    function reportError(e) {
        if(parent && parent.window && typeof parent.window.reportRuntimeError === 'function') {
            parent.window.reportRuntimeError(e);
        }
    }

    function reportErrorDirect(msg, line, column) {
        if(parent && parent.window && typeof parent.window.reportRuntimeErrorDirect === 'function') {
            parent.window.reportRuntimeErrorDirect(msg, line, column);
        }
    }

    window.onerror = function(message, file, line, column) {
        reportErrorDirect(message, line, column);
        exception = true;
    };

    window.onload = function() {
        if(parent && parent.window && typeof parent.window.frameIsLoaded === 'function') {
            parent.window.frameIsLoaded();
        }
    };

    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    CW = canvas.width;
    CH = canvas.height;
    window.setpixel = function(x, y, c) { return doSet(x, y, c); };
    window.getpixel = function(x, y) { return doGetColor(x, y); };
    window.getpixeli = function(x, y) { return doGet(x, y); };
    window.clear = function(c) { return doClear(c); };
    window.keyheld = function(k) { return doHeld(k); };
    window.keypress = function(k) { return doPressed(k); };
    window.keyrelease = function(k) { return doReleased(k); };

    window.startIt = function() {
        try {
            reset();
            client = (typeof ClientScript !== 'undefined') ? new ClientScript() : null;
            draw();
            frameDelay = window.game && window.game.frameDelay;
            if(animFrameID) {
                cancelAnimationFrame(animFrameID);
            }
            animFrameID = requestAnimationFrame(onFrame);
        }
        catch(e) {
            reportError(e);
        }
    };

    window.setFrameDelay = function(f) {
        frameDelay = f;
    };

    window.togglepause = function() {
        paused = !paused;
    };

    window.unpause = function() {
        paused = false;
    };

    window.restart = function() {
        step = true;
        startIt();
    };

    window.step = function() {
        paused = true;
        step = true;
    };

    window.isPaused = function() {
        return paused;
    };

    window.clearException = function () {
        reset();
    };

    window.getscreen = function() {
        return screen;
    };

    window.settings = function(settings) {
        frameDelay = settings.framedelay;        
    };

    draw();
    startIt();

}());
