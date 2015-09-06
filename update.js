// Catch the bright ones

var ship = {
        x: 0,
        y: 6,
        color: 1,
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
    ship.x += (held('left') ? -ship.speed : 0) + (held('right') ? ship.speed : 0);
    if(ship.x < 0) { ship.x = 0; }
    if(ship.x > 6) { ship.x = 6; }
}

function moveDots() {
    var i;
    if(time === 0) {
        for(i = 0; i < dots.length; ++i) {
            dots[i].y += 1;
            if(dots[i].y > 7)
            {
                dots.pop();
            }
        }
        if((ticks % 5) === 0) {
            dots.unshift({ x: (Math.random() * 8) >>> 0, y: 0, c: Math.random() > 0.8 ? 6 : 4 });
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
        if(dx >= px && dx < px + 2 && i.y >= 6) {
            if(i.c === 4) {
                ship.flash = 30;
                setState(dead);
            }
            else {
                ship.speed += 0.05;
                delay = Math.max(1, delay - 1);
                dots.pop();
                ++score;
                ship.glow = 10;
                ship.color = 2;
            }
        }
    }
}

function drawScore() {
    var i;
    for(i=0; i<score; ++i) {
        set(i, 7, 5);
    }
}

function drawPlayer() {
    var dx = ship.x >>> 0;
    if(--ship.glow === 0) { ship.color = 1; }
    if(ship.flash === 0 || --ship.flash / 4 % 1 !== 0) {
        set(dx, ship.y, ship.color);
        set(dx + 1, ship.y, ship.color);
        set(dx, ship.y + 1, ship.color);
        set(dx + 1, ship.y + 1, ship.color);
    }
}

function drawDots() {
    var i;
    for(i = 0; i < dots.length; ++i) {
        if(get(dots[i].x, dots[i].y) !== 5) {
            set(dots[i].x, dots[i].y, dots[i].c);
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
