(function(w) {

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
        ];

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
    }

    function draw(canvas, context, screen, W, H) {
        var x,
            y,
            cw = canvas.width,
            ch = canvas.height,
            xm = cw / W,
            ym = ch / H,
            xm2 = xm / 2,
            ym2 = ym / 2,
            i = 0;
        context.fillStyle = '#122';
        context.fillRect(0, 0, cw, ch);
        for(y = ym2; y < ch; y += ym) {
            for(x = xm2; x < cw; x += xm) {
                context.fillStyle = colors[screen[i++] & 15];
                context.globalAlpha = 0.8;
                ellipse(context, x, y, xm2 - 1, ym2 - 1, 1.75);
                context.fill();
                context.globalAlpha = 1.0;
                ellipse(context, x, y, xm2 - 2, ym2 - 2, 1.75);
                context.fill();
            }
        }
    }

    w.draw = draw;
    
})(mainApp);
