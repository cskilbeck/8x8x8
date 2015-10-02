var px, py, pv,
    delay,
    ground,
    obstacles;
    
reset();
    
function reset() {
    px = 2;
    py = 8;
    pv = 0;
    delay = 0;
    ground = true;
    obstacles = [];
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
    }
}

function drawObstacle(o) {
    var x,
        y = o.y,
        xe = o.x + o.w,
        ye = y + o.h;
    for(; y < ye; ++y) {
        for(x = o.x; x < xe; ++x) {
            setpixel(x, y, 'yellow');
        }
    }
}

function drawObstacles() {
    var i, o;
    for(i in obstacles) {
        drawObstacle(obstacles[i]);
    }
}

function moveObstacles() {
    var i, o;
    for(i in obstacles) {
        o = obstacles[i];
        o.x -= 0.25;
        if(o.x + o.w < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function drawGround() {
    var x, y;
    for(y=10; y<16; ++y) {
        for(x=0; x<16; ++x) {
            setpixel(x, y, 'orange');
        }
    }
}

function movePlayer() {
    if(keyheld('space') && ground) {
        pv = -0.5;
        if(py < 4) {
            ground = false;
        }
    }
    py += pv;
    if(py > 8) {
        py = 8;
        pv = 0;
        ground = true;
    }
    else {
        pv += 0.05;
    }
}

function drawPlayer() {
    setpixel(px, py, 'white');
    setpixel(px, py+1, 'white');
}

function collide() {
    if(getpixeli(px, py) !== 0 || getpixeli(px, py + 1) !== 0) {
        reset();
    }
}

function update(frame) {

    launchObstacle();
    moveObstacles();
    movePlayer();
    clear();
    drawObstacles();
    collide();
    drawGround();
    drawPlayer();
}
