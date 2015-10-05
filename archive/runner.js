var px, py, pv,
    delay,
    ground,
    speed,
    dead,
    obstacles;
    
reset();
    
function reset() {
    px = 2;
    py = 8;
    pv = 0;
    dead = 0;
    delay = 0;
    ground = 8;
    speed = 0.25;
    obstacles = [];
}

function update(frame) {
    if(dead === 0) {
        launchObstacle();
        moveObstacles();
        movePlayer();
    } else if(--dead === 0) {
        reset();
    }
    clear();
    drawObstacles();
    collide();
    drawGround();
    drawPlayer();
}

function launchObstacle() {
    var height = Math.random() * 3,
        width = Math.random() * 3;
    if(--delay < 0) {
        delay = Math.random() * 30 + 30;
        obstacles.push({
            x: 16,
            y: 10 - height,
            w: width,
            h: height
        });
        speed += 0.01;
    }
}

function moveObstacles() {
    var i, o;
    for(i in obstacles) {
        o = obstacles[i];
        o.x -= speed;
        if(o.x + o.w < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function movePlayer() {
    if(keyheld('space') && --ground > 0) {
        pv -= 0.5 / 4;
    }
    py += pv;
    if(py >= 8) {
        py = 8;
        pv = 0;
        ground = 8;
    }
    else {
        pv += 0.05;
    }
}

function drawObstacle(o) {
    var x, y,
        xe = o.x + o.w,
        ye = o.y + o.h;
    for(y = o.y; y < ye; ++y) {
        for(x = o.x; x < xe; ++x) {
            setpixel(x, y, 'yellow');
        }
    }
}

function drawObstacles() {
    var i;
    for(i in obstacles) {
        drawObstacle(obstacles[i]);
    }
}

function collide() {
    if(dead === 0) {
        if(getpixel(px, py) !== 'black' || getpixel(px, py + 1) !== 'black') {
            dead = 30;
        }
    }
}

function drawGround() {
    var x, y;
    for(y=10; y<16; ++y) {
        for(x=0; x<16; ++x) {
            setpixel(x, y, 'green');
        }
    }
}

function drawPlayer() {
    if((dead / 3) & 1) {
        return;
    }
    var color = dead ? 'red'  : 'white';
    setpixel(px, py, color);
    setpixel(px, py + 1, color);
}

