var player, move, tail, dead = 0;

reset();

function reset() {
    var i;
    clear();
    addGems(2, 3, true);
    tail = [{ x: 0, y: 0 }];
    player = { x: 0, y: 0 };
    move = { x: 1, y: 0 };
}

function addGems(n, c, f) {
    var i,x,y;
    for(; n > 0; --n) {
        do { x = Math.random() * 8; y = Math.random() * 8; } while(get(x, y) !== 0 && f);
        set(x, y, c);
    }
}

function update(frame) {
    var o;
    if(dead === 0) {
        move = pressed('down') ? { x: 0, y: 1 } : pressed('up') ? { x: 0, y: -1 } :
                pressed('left') ? { x: -1, y: 0 } : pressed('right') ? { x: 1, y: 0 } : move;
        if(frame % 6 === 0) {
            set(player.x, player.y, 4);
            player = { x: player.x + move.x & 7, y: player.y + move.y & 7 };
            switch(get(player.x, player.y)) {
            case 3:
                addGems(1, 3, true);
                break;
            case 4:
                dead = 40;
                break;
            default:
                o = tail.shift();
                set(o.x, o.y, 0);
            }
            tail.push(player);
            set(player.x, player.y, 7);
        }
    }
    else {
        addGems(10, 1, false);
        if(--dead === 0) {
            reset();
        }
    }
}