var player, move, tail, dead = 0;

reset();

function reset() {
    clear();
    addGems(2, 'orange', true);
    tail = [{ x: 0, y: 0 }];
    player = { x: 0, y: 0 };
    move = { x: 1, y: 0 };
}

function addGems(n, c, f) {
    var i,x,y;
    for(; n > 0; --n) {
        do { x = Math.random() * 16; y = Math.random() * 16; } while(get(x, y) !== 0 && f);
        set(x, y, c);
    }
}

function update(frame) {
    var o;
    if(dead === 0) {
        move = pressed('down') ? { x: 0, y: 1 } : pressed('up') ? { x: 0, y: -1 } :
                pressed('left') ? { x: -1, y: 0 } : pressed('right') ? { x: 1, y: 0 } : move;
        if(frame % 6 === 0) {
            set(player.x, player.y, 'blue');
            player = { x: player.x + move.x & 15, y: player.y + move.y & 15 };
            switch(getColor(player.x, player.y)) {
            case 'orange':
                addGems(1, 'orange', true);
                break;
            case 'blue':
                dead = 40;
                break;
            default:
                o = tail.shift();
                set(o.x, o.y, 0);
            }
            tail.push(player);
            set(player.x, player.y, 'white');
        }
    }
    else {
        addGems(10, 'red', false);
        if(--dead === 0) {
            reset();
        }
    }
}