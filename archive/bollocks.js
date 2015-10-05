var x = 0, y = 0, xvel = 1, yvel = 0.5, color = 1;

function update(frame) {
    x += xvel;
    y += yvel;
    if(x < 0 || x >= 16) {
        xvel = (x < 0) ? 1 : -1;
        yvel = Math.random() * 2 - 1;
        color = (++color) % 14;
    }
    if(y < 0 || y >= 16) {
        yvel = (y < 0) ? 1 : -1;
        xvel = Math.random() * 2 - 1;
        color = (++color) % 14;
    }
    setpixel(x, y, color + 1);
}