var ship, bullet, invaders, dead;

reset();

function draw(obj) {
    var x, y, s = 0;
    if(obj !== null) {
        for(y = 0; y<obj.height; ++y) {
            for(x = 0; x<obj.width; ++x) {
                set(x + obj.x, y + obj.y, obj.color[s++]);
            }
        }
    }
}

function reset() {
    invaders = [];
    ship = { x: 3, y: 15, color: ['darkgreen','lightgreen','darkgreen'], width: 3, height: 1 };
    dead = 0;
    bullet = { x: 0, y: 0, width: 1, height: 1, color: ['red'], live: false };
}

function pointIn(p, o) {
    var xd = (o.x | 0) - (p.x | 0),
        yd = (o.y | 0) - (p.y | 0);
    return xd >= 0 && xd <= o.width && yd >= 0 && yd <= o.height;
}

function launchInvader() {
    invaders.push({ x: -1, y: 0, width: 3, height: 1, color: ['lightblue','white','lightblue'], xvel: 0.2, yvel: 0 });
}

function resetBullet() {
    bullet.x = ship.x + 1;
    bullet.y = ship.y - 1;
    if(pressed('space')) {
        bullet.live = true;
    }
}

function updateShip() {
    var i,
        xv = 0;
    if(held('left')) {
        xv -= 0.2;
    }
    if(held('right')) {
        xv += 0.2;
    }
    ship.x += xv;
    if(ship.x < -1) {
        ship.x = -1;
    }
    if(ship.x >= 14) {
        ship.x = 14;
    }
}

function updateBullet() {
    if(!bullet.live) {
        resetBullet();
    }
    if(bullet.live) {
        bullet.y -= 0.25;
        if(bullet.y < -3) {
            bullet.live = false;
        }
    }
}

function updateInvaders() {
    var i, v;
    for(i=0; i<invaders.length; ++i) {
        v = invaders[i];
        v.x += v.xvel;
        if(v.x < -1 || v.x >= 15) {
            v.y += 1;
            if(v.y >= 15) {
                dead = 50;
            }
            v.xvel = -v.xvel;
            v.x += v.xvel;
        }
    }
}

function drawInvaders() {
    var i, v;
    for(i=0; i<invaders.length; ++i) {
        v = invaders[i];
        draw(v);
    }
}

function checkBullet() {
    var i, v;
    if(bullet.live && get(bullet.x, bullet.y) !== 0) {
        for(i=0; i<invaders.length; ++i) {
            v = invaders[i];
            if(Math.abs((v.y|0) - (bullet.y|0)) < 1) {
                v.x -= 1;
                v.width = 5;
                v.color = ['orange', 'yellow', 'white', 'yellow', 'orange'];
                draw(v);
                invaders.splice(i,1);
                bullet.live = false;
                resetBullet();
                break;
            }
        }
    }
}

function update(frame) {
    if(dead === 0) {

        updateBullet();
        updateShip();
        updateInvaders();

        clear();
        draw(ship);
        drawInvaders();
        checkBullet();
        draw(bullet);

        if((frame % 100) === 0) {
            launchInvader();
        }
    }
    else if(--dead === 0) {
        reset();
    }
}