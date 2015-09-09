var x = 0, y = 0;

clear(0);

function update(frame) {
    var ox = x, oy = y;
    if(pressed('left')) {
        x -= 1;
    }
    if(pressed('right')) {
        x += 1;
    }
    if(pressed('up')) {
        y -= 1;
    }
    if(pressed('down')) {
        y += 1;
    }
    if((ox != x || oy != y) && get(x, y) !== 0) {
        clear(0);
    }
    set(x, y, held('space') ? 2 : 1);
}