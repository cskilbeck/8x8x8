var player, move, tail, dead = 0;

reset();

function reset() {
    var i;
    clear();
    for(i=0; i<4; ++i) {
        addGem();
    }
    tail = [{ x: 0, y: 0 }];
    player = { x: 0, y: 0 };
    move = { x: 1, y: 0 };
}

function addGem() {
    var x,y;
    do { x = Math.random() * 8; y = Math.random() * 8; } while(get(x, y) !== 0);
    set(x, y, 3);
}

function update(frame) {
    var o;
    if(dead === 0) {
        if(pressed('down')) { move = { x: 0, y: 1 }; }
        if(pressed('up')) { move = { x: 0, y: -1 }; }
        if(pressed('left')) { move = { x: -1, y: 0 }; }
        if(pressed('right')) { move = { x: 1, y: 0 }; }
        if(frame % 6 === 0) {
            set(player.x, player.y, 4);
            player = { x: player.x + move.x & 7, y: player.y + move.y & 7 };
            switch(get(player.x, player.y)) {
            case 3:
                addGem();
                break;
            case 4:
                dead = (tail.length - 1) * 2;
                break;
            default:
                o = tail.shift();
                if(o) {
                    set(o.x, o.y, 0);
                }
            }
            tail.push(player);
            set(player.x, player.y, 7);
        }
    }
    else {
        set(tail[dead >>> 1].x, tail[dead >>> 1].y, 1);
        if(--dead === 0) {
            reset();
        }
    }
}