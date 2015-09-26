var c = 1;

function update(frame) {
    var i, y, s = 12;
    if(keypress() === 'space') {
        c = ++c & 15;
    }
    if(keyheld('down')) {
        s = 18;
    }
    clear();
    for(i = 0; i < 16; ++i) {
        y = Math.sin(i / 20 * 6.28 + frame / 5) * Math.sin(frame / s) * 8 + 8;
        setpixel(i, y, 'white');
        for(++y; y < 16; ++y) {
            setpixel(i, y, c);
        }
    }
}