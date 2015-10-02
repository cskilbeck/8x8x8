function update(frame) {
    var x, y, a, b;
    for(y = 0; y <16; ++y) {
        for(x = 0; x < 16; ++x) {
            a = (x - 7.5) / 1.25;
            b = (y - 7.5) / 1.25;
            setpixel(x, y, frame / 6 - Math.sqrt(a * a + b * b));
        }
    }
}
