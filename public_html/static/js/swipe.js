// courtesy of http://padilicious.com/
(function(globals) {

    globals.touchEnable = function(element, options, callback) {

        var settings = {
                tapTime: 350,               // longest tap allowed in ms
                minLength: 72               // length that causes a swipe, in viewport pixels
            };

        var ox, oy, t, ID = 0;

        element.addEventListener('touchstart', function(event) {
            event.preventDefault();
            if(event.touches.length == 1) {
                ox = event.touches[0].pageX;
                oy = event.touches[0].pageY;
                ID = event.touches[0].identifier;
                t = Date.now();
            } else {
                ID = 0;
            }
        });
        
        element.addEventListener('touchmove', function(event) {
            var dx, dy, r;
            event.preventDefault();
            if(event.touches.length === 1 && event.touches[0].identifier === ID) {
                dx = event.touches[0].pageX - ox;
                dy = event.touches[0].pageY - oy;
                if (Math.sqrt(dx * dx + dy * dy) >= settings.minLength ) {
                    element.dispatchEvent(new CustomEvent('touch', { detail: swipeDirection(Math.atan2(Y, X) / Math.PI) }));
                    ID = 0;
                }
            } else {
                ID = 0;
            }
        });
        
        element.addEventListener('touchend', function(event) {
            event.preventDefault();
            if(event.touches.length === 1 && event.touches[0].identifier === ID) {
                if(Date.now() - t < settings.tapTime) {
                    element.dispatchEvent(new CustomEvent('touch', { detail: 'tap' }));
                    element.dispatchEvent(new Event('tap'));
                }
                ID = 0;
            }
        });

        function swipeDirection(a) {
            var ma = Math.abs(a);
            return ma > 0.75 ? 'down' : ma < 0.25 ? 'up': a > 0 ? 'right' : 'left';
        }
    };

})(window);
