(function() {
    "option strict";

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
    "option strict";

    var W = 8,
        H = 8,
        CW,
        CH,
        context,
        canvas,
        editor,
        exception = false,
        keyCount = 0,
        lastkey,
        frame = 0,
        colors = [
            "#000",
            "#F00",
            "#0F0",
            "#FF0",
            "#00F",
            "#F0F",
            "#0FF",
            "#FFF"
        ],
        keyPressed = [ false, false, false, false, false ],
        keyHeld = [ false, false, false, false, false ],
        keyReleased = [ false, false, false, false, false ],
        screen = [];

    function reportError(e) {
        parent.window.reportError(e);
    }

    function ellipse(ctx, cx, cy, w, h){
        var lx = cx - w,
            rx = cx + w,
            ty = cy - h,
            by = cy + h;
        var m = 0.551784;
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
                context.fillStyle = colors[screen[i++] & 7];
                context.globalAlpha = 0.8;
                ellipse(context, x, y, xm2 - 1, ym2 - 1);
                context.fill();
                context.globalAlpha = 1.0;
                ellipse(context, x, y, xm2 - 2, ym2 - 2);
                context.fill();
            }
        }
    }

    function GetKey(str, arr) {
        switch(str.toLowerCase()) {
            case ' ': return arr[0];
            case 'space' : return arr[0];
            case 'left': return arr[1];
            case 'up': return arr[2];
            case 'right': return arr[3];
            case 'down': return arr[4];
            default: return false;
        }
    }

    function doSet(x, y, color) {
        x >>>= 0;
        y >>>= 0;
        if(x >= 0 && x < 8 && y >= 0 && y < 8) {
            screen[x + y * W] = color;
        }
    }

    function doGet(x, y) {
        x >>>= 0;
        y >>>= 0;
        if(x >= 0 && x < 8 && y >= 0 && y < 8) {
            return screen[x + y * W];
        }
        return 0;
    }

    function doClear(color) {
        var i;
        for(i=0; i<W*H; ++i) {
            screen[i] = color || 0;
        }
    }

    function doPressed(key) {
        return GetKey(key, keyPressed);
    }

    function doHeld(key) {
        return GetKey(key, keyHeld);
    }

    function doReleased(key) {
        return GetKey(key, keyReleased);
    }

    function GetKeyCode(key) {
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

    document.onkeydown = function(e) {
        var key;
        if(e.keyCode === 27) {
            parent.window.focus();
            parent.FocusEditor();
        }
        if(keyCount > 0 && e.keyCode === lastkey) {
        }
        else
        {
            lastkey = e.keyCode;
            key = GetKeyCode(e.keyCode);
            if(key !== null) {
                keyPressed[key] = true;
                keyHeld[key] = true;
            }
        }
        ++keyCount;
        if(e.keyCode in [32, 37, 38, 39, 40]) {
            e.preventDefault();
        }
    };

    document.onkeyup = function(e) {
        var key = GetKeyCode(e.keyCode);
        keyCount = lastkey = 0;
        if(key !== null) {
            keyReleased[key] = true;
            keyHeld[key] = false;
        }
    };

    function onFrame() {
        var i;
        if(typeof update === 'function' && !exception) {
            try {
                update(frame++);
            }
            catch(e) {
                exception = true;
                reportError(e);
            }
        }
        draw();
        for(i=0; i<5; ++i) {
            keyPressed[i] = false;
            keyReleased[i] = false;
        }
        requestAnimationFrame(onFrame);
    }

    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    CW = canvas.width;
    CH = canvas.height;
    window.set = function(x, y, c) { return doSet(x, y, c); };
    window.get = function(x, y) { return doGet(x, y); };
    window.clear = function(c) { return doClear(c); };
    window.held = function(k) { return doHeld(k); };
    window.pressed = function(k) { return doPressed(k); };
    window.released = function(k) { return doReleased(k); };

    window.onerror = function(e) {
        reportError(e);
        exception = true;
    };

    if(typeof parent.GameSource !== 'undefined') {
        var script = document.createElement('script');
        var body = document.getElementsByTagName('body')[0];
        script.type = 'text/javascript';
        script.innerHTML = parent.GameSource;
        body.appendChild(script);
    }

    requestAnimationFrame(onFrame);

}());
