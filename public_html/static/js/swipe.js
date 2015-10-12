(function(globals) {

    var settings = {
            tapTime: 100,               // longest tap allowed in ms
            minLengthSquared: 25 * 25   // length that causes a swipe, in viewport pixels
        };

    var ox, oy, t, ID = 0, ck = null, tapper;

    var downThreshold = 0.75 * Math.PI,
        upThreshold = 0.25 * Math.PI;

    function send(x) {
        //element.dispatchEvent(new CustomEvent('swipe', { detail: x }));
        console.log(x);
    }

    function swipeDirection(e) {
        var dx = e.pageX - ox,
            dy = e.pageY - oy,
            a = Math.atan2(dy, dx),
            ma = a < 0 ? -a : a;
        return dx * dx + dy * dy < settings.minLengthSquared ? 'center' :
                ma > downThreshold ? 'left' :
                ma < upThreshold ? 'right' :
                a > 0 ? 'down' :
                'up';
    }

    function start(e) {
        e.preventDefault();
        if(e.touches.length == 1) {
            ox = e.touches[0].pageX;
            oy = e.touches[0].pageY;
            ID = e.touches[0].identifier;
            t = Date.now();
            send({ direction: 'center', action: 'press' });
            ck = 'center';
            tapper = true;
        } else {
            ID = 0;
        }
    }

    function move(e) {
        var r;
        e.preventDefault();
        if(e.touches.length === 1 && e.touches[0].identifier === ID) {
            r = swipeDirection(e.touches[0]);
            if(ck !== r) {
                send({ direction: ck, action: 'release' });
                send({ direction: r, action: 'press' });
                if(r !== 'center') {
                    tapper = false;
                }
                ck = r;
            }
        } else {
            ID = 0;
        }
    }

    function end(e) {
        e.preventDefault();
        if(e.changedTouches.length === 1 && e.changedTouches[0].identifier === ID) {
            send({ direction: ck, action: 'release' });
            if(tapper && Date.now() - t < settings.tapTime) {
                send({ direction: 'center', action: 'tapped' });
            }
            tapper = false;
            ck = null;
            ID = 0;
        }
    }

    globals.touchEnable = function(element) {
        element.addEventListener('touchstart', start, true);
        element.addEventListener('touchmove', move, true);
        element.addEventListener('touchend', end, true);
    };

})(window);
