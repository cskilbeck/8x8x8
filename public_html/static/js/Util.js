(function() {

    mainApp.factory('util', ['$timeout', function($timeout) {

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

            focus: function(elem) {
                if(elem) {
                    $timeout(function() {
                        elem.focus();
                    });
                }
            }
        };

        return util;

    }]);

})();
