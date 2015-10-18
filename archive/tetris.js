var pieces = [
        { color: 'red',         rotmax: 2, org: [  0,1.5], p: [0,0,  0,1,  0,2,  0,3] },    // 0
        { color: 'green',       rotmax: 4, org: [0.5,0.5], p: [0,0,  0,1,  1,0,  0,2] },    // 1
        { color: 'blue',        rotmax: 4, org: [0.5,0.5], p: [0,0,  0,1,  1,0,  1,1] },    // 2
        { color: 'magenta',     rotmax: 2, org: [0.5,0.5], p: [0,0,  0,1,  1,1,  1,2] },    // 3
        { color: 'yellow',      rotmax: 2, org: [0.5,0.5], p: [1,0,  1,1,  0,1,  0,2] },    // 4
        { color: 'orange',      rotmax: 4, org: [  0,  1], p: [0,0,  0,1,  0,2,  1,1] },    // 5
        { color: 'lightblue',   rotmax: 4, org: [0.5,0.5], p: [0,0,  1,0,  1,1,  1,2] }     // 6
    ],
    numPieces = pieces.length,
    rotations = [ [1,0,0,1], [0,1,-1,0], [-1,0,0,-1], [0,-1,1,0] ],
    offsets = [ [-1,0], [-1,1], [0,1], [1,1], [1,0] ],
    kleft  = { key: 'left',  dt: 0, dl: 20, delay: 20, repeat: 2, dir: -1 },
    kright = { key: 'right', dt: 0, dl: 20, delay: 20, repeat: 1, dir: 1 },
    kdown  = { key: 'down',  dt: 0, dl: 10, delay: 10, repeat: 1, dir: 1 };

var r = 0,
    p,
    np = randomPiece(),
    x,
    y,
    speed = 30,
    delay = speed, hit = false, moves = 0, flash = [];

// set up the board
clear();
box(0, -1, 12, 17, 'lightgreen');
rectangle(1,0,10,15, 'darkblue');
newPiece();

function resetKey(k) {
    for(var i in k)
        k[i].dt = k[i].dl = k[i].delay;
}

// set up new piece on the right
function newPiece() {
    resetKey([kleft, kright, kdown]);
    p = np;
    x = 6 - pieces[p].org[0];
    y = 1 - pieces[p].org[1];
    r = 0;
    if(collide(x, y, p, r)) {
        reset();
    }
    np = randomPiece();
    rectangle(12, 0, 4, 8, 0);
    drawPiece(13.5 - pieces[np].org[0], 3 - pieces[np].org[1], np, 0);
}

// get a rotated point of a piece
function txpoint(x, y, p, rot) {
    var px = x - p.org[0], py = y - p.org[1];
    return [px * rot[0] + py * rot[1] + p.org[0], px * rot[2] + py * rot[3] + p.org[1]];
}

// draw a piece    
function drawPiece(x, y, piece, rotation, clr) {
    var i, tp, p = pieces[piece],
        r = rotation % p.rotmax,
        color = clr || p.color,
        rot = rotations[r >= 0 ? r : r + p.rotmax];
    for(i=0; i<p.p.length; i += 2) {
        tp = txpoint(p.p[i], p.p[i + 1], p, rot);
        setpixel(x + tp[0], y + tp[1], color);
    }
}

// check if a piece collides
function collide(x, y, piece, rotation) {
    var i, tp, p = pieces[piece],
        r = rotation % p.rotmax,
        rot = rotations[r >= 0 ? r : r + p.rotmax];
    for(i=0; i<p.p.length; i += 2) {
        tp = txpoint(p.p[i], p.p[i + 1], p, rot);
        if(y + tp[1] >= 0 && getpixel(x + tp[0], y + tp[1]) !== 'darkblue') {
            return true;
        }
    }
    return false;
}

// check for completed rows
function checklines() {
    var x, y, l;
    for(y = 14; y > 0; --y) {
        l = true;
        for(x = 1; x < 12; ++x) {
            if(getpixel(x, y) === 'darkblue') {
                l = false;
                break;
            }
        }
        if(l) {
            rectangle(1, y, 10, 1, 'white');
            flash.push(y);
        }
    }
}

// get a random piece
function randomPiece() {
    return Math.random() * numPieces >>> 0;
}

// check if a key is pressed (and do auto-repeat)
function keycheck(ko) {
    var r = 0;
    if(keyheld(ko.key)) {
        if(ko.dt === 0) {
            r = ko.dir;
        }
        ko.dt -=1;
        if(ko.dt < 0) {
            ko.dt = ko.dl;
            ko.dl = ko.repeat;
        }
    }
    else {
        ko.dt = 0;
        ko.dl = ko.delay;
    }
    return r;
}

function droplines() {
    var i, dx, dy;
    dy = flash.shift();
    for(dx = 1; dx < 11; ++dx) {
        for(i = dy; i > 0; --i) {
            setpixel(dx, i, getpixeli(dx, i-1));
        }
    }
    for(i in flash) {
        ++flash[i];
    }
    speed = Math.max(10, speed - 0.5);
}

// main loop
function update(frame) {
    var i, o, dx = 0, dy = 0, dr = 0;
    if(flash.length > 0) {
        droplines();
        return;
    }
    if(keypress() === 'up') { dr += 1; }
    if(keypress() === 'space') { dr -= 1; }
    dx += keycheck(kleft) + keycheck(kright);
    dy = keycheck(kdown);
    drawPiece(x, y, p, r, 'darkblue');
    if(delay === 0) {
        dy = 1;
        delay = Math.floor(speed);
    }
    // this is fugly
    if(!collide(x + dx, y + dy, p, r + dr)) {
        x += dx; y += dy; r += dr;
        drawPiece(x, y, p, r);
    }
    else if(!collide(x + dx, y + dy, p, r)) {
        x += dx; y += dy;
        drawPiece(x, y, p, r);
    }
    else if(!collide(x, y, p, r + dr) && dy === 0) {
        r += dr;
        drawPiece(x, y, p, r);
    }
    else if(!collide(x, y + dy, p, r + dr)) {
        y += dy; r += dr;
        drawPiece(x, y, p, r);
    }
    else {
        drawPiece(x, y, p, r, 'darkgreen');
        checklines();
        newPiece();
    }
    delay -= 1;
}
