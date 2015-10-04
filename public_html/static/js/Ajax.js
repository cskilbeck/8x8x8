(function() {

    // DONE (chs): make it use angular $ajax
    // DONE (chs): make it return the response object whether it fails or succeeds, let the caller extract the data

    var user = {
        id: function() { return 0; },
        session: function() { return 0; }
    };

    mainApp.factory('ajax', ['$rootScope', '$http', 'status',
    function($rootScope, $http, status) {
        "use strict";

        function valid(data) {
            if(typeof data === 'undefined') {
                data = {};
            }
            if(typeof data.user_id === 'undefined') {
                data.user_id = user.id();
            }
            if(typeof data.user_session === 'undefined') {
                data.user_session = user.session();
            }
            return data;
        }

        var ajax = {

            set_user: function(u) {
                user = u;
            },

            submit: function(fn, url, params, data, msg) {
                var q = Q.defer();
                status.busy(true);
                msg = msg || '';
                if(msg) {
                    status(msg);
                }
                // console.log(fn, url, "PARAMS", params, "DATA", data);
                $http({ method: fn,
                        url: 'http://256pixels.net/api/' + url,
                        params: params,
                        data: data
                    })
                .then(function(response) {
                    status.busy(false);
                    if(msg) {
                        status('Finished ' + msg);
                    }
                    q.resolve(response);
                }, function(response) {
                    status.busy(false);
                    status.error('Error ' + msg + ': ' + response.statusText);
                    q.reject(response);
                });
                return q.promise;
            },

            get: function(url, data, msg) {
                return ajax.submit('GET', url, valid(data), {}, msg);
            },

            post: function(url, data, msg) {
                return ajax.submit('POST', url, {}, valid(data), msg);
            }
        };

        return ajax;

    }]);

})();
