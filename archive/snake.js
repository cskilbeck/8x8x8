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
        do { x = Math.random() * 16; y = Math.random() * 16; } while(getpixel(x, y) !== 'black' && f);
        setpixel(x, y, c);
    }
}

function update(frame) {
    var o;
    if(dead === 0) {
        if(frame % 6 === 0) {
            switch(keypress()) {
                case 'down': move = { x: 0, y: 1 }; break;
                case 'up': move = { x: 0, y: -1 }; break;
                case 'left': move = { x: -1, y: 0 }; break;
                case 'right': move = { x: 1, y: 0 }; break;
            }
            setpixel(player.x, player.y, 'blue');
            player = { x: player.x + move.x & 15, y: player.y + move.y & 15 };
            switch(getpixel(player.x, player.y)) {
            case 'orange':
                addGems(1, 'orange', true);
                break;
            case 'blue':
                dead = 40;
                break;
            default:
                o = tail.shift();
                setpixel(o.x, o.y, 0);
            }
            tail.push(player);
            setpixel(player.x, player.y, 'white');
        }
    }
    else {
        addGems(10, 'red', false);
        if(--dead === 0) {
            reset();
        }
    }
}