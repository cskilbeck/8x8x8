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

// RequestAnimationFrame polyfill

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

// main

(function() {
    "option strict";

    var W = 8,
        H = 8,
        CW,
        CH,
        context,
        canvas,
        editor,
        keyCount = 0,
        lastkey,
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

    function doClearscreen(color) {
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
        if(keyCount > 0 && e.keyCode === lastkey) {
            e.preventDefault();
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
        if(typeof update === 'function') {
            update();
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
    window.clear = function(c) { return doClearscreen(); };
    window.held = function(k) { return doHeld(k); };
    window.pressed = function(k) { return doPressed(k); };
    window.released = function(k) { return doReleased(k); };

    editor = ace.edit("editor");
    editor.$blockScrolling = Infinity;
    editor.setValue("// Catch the bright ones\n\nvar ship = {\n        x: 0,\n        y: 6,\n        color: 1,\n        glow: 0,\n        flash: 0,\n        speed: 0.25\n    },\n    time,\n    delay,\n    ticks,\n    frame,\n    state,\n    score,\n    dots;\n\nreset();\n\nfunction reset() {\n    time = 0;\n    delay = 10;\n    ticks = 0;\n    score = 0;\n    dots = [];\n    ship.speed = 0.25;\n    ship.flash = 0;\n    setState(playing);\n}\n\nfunction setState(s) {\n    state = s;\n    frame = 0;\n}\n\nfunction update() {\n    state();\n    time = ++time % delay;\n    if(time === 0) {\n        ++ticks;\n    }\n    ++frame;\n}\n\nfunction movePlayer() {\n    ship.x += (held('left') ? -ship.speed : 0) + (held('right') ? ship.speed : 0);\n    if(ship.x < 0) { ship.x = 0; }\n    if(ship.x > 6) { ship.x = 6; }\n}\n\nfunction moveDots() {\n    var i;\n    if(time === 0) {\n        for(i = 0; i < dots.length; ++i) {\n            dots[i].y += 1;\n            if(dots[i].y > 7)\n            {\n                dots.pop();\n            }\n        }\n        if((ticks % 5) === 0) {\n            dots.unshift({ x: (Math.random() * 8) >>> 0, y: 0, c: Math.random() > 0.8 ? 6 : 4 });\n        }\n    }\n}\n\nfunction checkCollision() {\n    var i,\n        dx,\n        px;\n    if(dots.length > 0) {\n        i = dots[dots.length - 1];\n        dx = i.x >>> 0;\n        px = ship.x >>> 0;\n        if(dx >= px && dx < px + 2 && i.y >= 6) {\n            if(i.c === 4) {\n                ship.flash = 30;\n                setState(dead);\n            }\n            else {\n                ship.speed += 0.05;\n                delay = Math.max(1, delay - 1);\n                dots.pop();\n                ++score;\n                ship.glow = 10;\n                ship.color = 2;\n            }\n        }\n    }\n}\n\nfunction drawScore() {\n    var i;\n    for(i=0; i<score; ++i) {\n        set(i, 7, 5);\n    }\n}\n\nfunction drawPlayer() {\n    var dx = ship.x >>> 0;\n    if(--ship.glow === 0) { ship.color = 1; }\n    if(ship.flash === 0 || --ship.flash / 4 % 1 !== 0) {\n        set(dx, ship.y, ship.color);\n        set(dx + 1, ship.y, ship.color);\n        set(dx, ship.y + 1, ship.color);\n        set(dx + 1, ship.y + 1, ship.color);\n    }\n}\n\nfunction drawDots() {\n    var i;\n    for(i = 0; i < dots.length; ++i) {\n        if(get(dots[i].x, dots[i].y) !== 5) {\n            set(dots[i].x, dots[i].y, dots[i].c);\n        }\n    }\n}\n\nfunction draw() {\n    clear();\n    drawScore();\n    drawPlayer();\n    drawDots();\n}\n\nfunction dead() {\n    draw();\n    if(frame > 30) {\n        reset();\n    }\n}\n\nfunction playing() {\n    movePlayer();\n    moveDots();\n    checkCollision();\n    draw();\n}\n", -1);
    editor.setShowPrintMargin(false);
    editor.setDisplayIndentGuides(false);
    editor.renderer.setShowGutter(false);
    editor.setShowFoldWidgets(false);
    editor.getSession().setMode("ace/mode/javascript");

    requestAnimationFrame(onFrame);

}());
