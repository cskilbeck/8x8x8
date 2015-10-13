(function() {

    mainApp.factory('util', function() {

        var util = {

            load: function(name) {
                var d = localStorage.getItem(name);
                if(d) {
                    try {
                        return JSON.parse(d);
                    }
                    catch(SyntaxError) {
                        return d;
                    }
                }
                return void 0;
            },

            save: function(name, obj) {
                localStorage.setItem(name, JSON.stringify(obj));
            },

            handy: function() {

            }
        };

        return util;

    });

})();
