mainApp.factory('cookie',
function() {
    "use strict";

    var cookie = {

        set: function(name, value, days) {
            var expires;
            if (days) {
                var date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = '; expires=' + date.toGMTString();
            } else {
                expires = '';
            }
            document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + expires + '; path=/';
        },

        // returns cookie value if it exists or defaultValue (or null if no defaultValue supplied)
        get: function(name, defaultValue) {
            var nameEQ = encodeURIComponent(name) + '=',
                ca = document.cookie.split(';'),
                i, c ;
            for (i = 0; i < ca.length; i++) {
                c = ca[i];
                while (c.charAt(0) === ' ') {
                    c = c.substring(1, c.length);
                }
                if (c.indexOf(nameEQ) === 0) {
                    return decodeURIComponent(c.substring(nameEQ.length, c.length));
                }
            }
            return defaultValue || null;
        },

        clear: function(name) {
            cookie.set(name, '', -1);
        }

    };
    return cookie;
});
