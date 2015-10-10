if(typeof mainApp === typeof void 0) {
    mainApp = {};
}

(function() {

    var colors = [
            '#000', // black
            '#080', // dark green
            '#0F0', // green
            '#8F8', // light green
            '#800', // dark red
            '#F00', // red
            '#F88', // light red
            '#008', // dark blue
            '#00F', // blue
            '#0FF', // lightblue
            '#808', // purple
            '#F0F', // magenta
            '#F8F', // pink
            '#F80', // orange
            '#FF0', // yellow
            '#FFF'  // white
        ],
        pixels = [];

    function ellipse(ctx, cx, cy, w, h, rounded){
        var lx = cx - w,
            rx = cx + w,
            ty = cy - h,
            by = cy + h;
        var m = 0.551784 * (rounded || 1);
        var xm = m * w;
        var ym = h * m;
        ctx.beginPath();
        ctx.moveTo(cx, ty);
        ctx.bezierCurveTo(cx + xm, ty, rx, cy - ym, rx, cy);
        ctx.bezierCurveTo(rx, cy + ym, cx + xm, by, cx, by);
        ctx.bezierCurveTo(cx - xm, by, lx, cy + ym, lx, cy);
        ctx.bezierCurveTo(lx, cy - ym, cx - xm, ty, cx, ty);
        ctx.fill();
    }

    function initpixels(w, h) {
        var i,
            context,
            canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        context = canvas.getContext('2d');
        for(i=0; i<colors.length; ++i) {

            context.globalAlpha = 1;
            context.fillStyle = '#122';
            context.fillRect(0, 0, w, h);

            context.fillStyle = colors[i];
            context.globalAlpha = 0.8;
            ellipse(context, w / 2, w / 2, w / 2 - 1, h / 2 - 1, 1.75);

            context.globalAlpha = 1.0;
            ellipse(context, w / 2, w / 2, w / 2 - 2, h / 2 - 2, 1.75);

            pixels.push(context.getImageData(0, 0, w, h));
        }
    }

    function draw(canvas, context, screen, W, H) {
        var x,
            y,
            cw = canvas.width,
            ch = canvas.height,
            xm = cw / W,
            ym = ch / H,
            i = 0,
            p;
        if(pixels.length === 0) {
            initpixels(xm, ym);
        }
        for(y = 0; y < ch; y += ym) {
            for(x = 0; x < cw; x += xm) {
                p = screen[i++] & 15 || 0;
                context.putImageData(pixels[p], x, y);
            }
        }
    }

    mainApp.draw = draw;
    
})();
