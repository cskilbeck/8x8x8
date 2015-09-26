// Catch the bright ones

var ship = {
        x: 0,
        y: 14,
        color: 'red',
        glow: 0,
        flash: 0,
        speed: 0.25
    },
    time,
    delay,
    ticks,
    frame,
    state,
    score,
    dots;

reset();

function reset() {
    time = 0;
    delay = 10;
    ticks = 0;
    score = 0;
    dots = [];
    ship.speed = 0.25;
    ship.flash = 0;
    setState(playing);
}

function setState(s) {
    state = s;
    frame = 0;
}

function update() {
    state();
    time = ++time % delay;
    if(time === 0) {
        ++ticks;
    }
    ++frame;
}

function movePlayer() {
    ship.x += (keyheld('left') ? -ship.speed : 0) + (keyheld('right') ? ship.speed : 0);
    if(ship.x < 0) { ship.x = 0; }
    if(ship.x > 14) { ship.x = 14; }
}

function moveDots() {
    var i;
    if(time === 0) {
        for(i = 0; i < dots.length; ++i) {
            dots[i].y += 1;
            if(dots[i].y > 15)
            {
                dots.pop();
            }
        }
        if((ticks % 5) === 0) {
            dots.unshift({ x: (Math.random() * 16) >>> 0, y: 0, c: Math.random() > 0.8 ? 'yellow' : 'blue' });
        }
    }
}

function checkCollision() {
    var i,
        dx,
        px;
    if(dots.length > 0) {
        i = dots[dots.length - 1];
        dx = i.x >>> 0;
        px = ship.x >>> 0;
        if(dx >= px && dx < px + 2 && i.y >= 14) {
            if(i.c === 'blue') {
                ship.flash = 30;
                setState(dead);
            }
            else {
                ship.speed += 0.05;
                delay = Math.max(1, delay - 1);
                dots.pop();
                ++score;
                ship.glow = 10;
                ship.color = 'green';
            }
        }
    }
}

function drawScore() {
    var i;
    for(i=0; i<score; ++i) {
        setpixel(i, 15, 'purple');
    }
}

function drawPlayer() {
    var dx = ship.x >>> 0;
    if(--ship.glow === 0) { ship.color = 'red'; }
    if(ship.flash === 0 || --ship.flash / 4 % 1 !== 0) {
        setpixel(dx, ship.y, ship.color);
        setpixel(dx + 1, ship.y, ship.color);
        setpixel(dx, ship.y + 1, ship.color);
        setpixel(dx + 1, ship.y + 1, ship.color);
    }
}

function drawDots() {
    var i;
    for(i = 0; i < dots.length; ++i) {
        if(getpixel(dots[i].x, dots[i].y) !== 'red') {
            setpixel(dots[i].x, dots[i].y, dots[i].c);
        }
    }
}

function draw() {
    clear();
    drawScore();
    drawPlayer();
    drawDots();
}

function dead() {
    draw();
    if(frame > 30) {
        reset();
    }
}

function playing() {
    movePlayer();
    moveDots();
    checkCollision();
    draw();
}
