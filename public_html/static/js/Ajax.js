(function() {

    // DONE (chs): make it use angular $ajax
    // DONE (chs): make it return the response object whether it fails or succeeds, let the caller extract the data

    var user = {
        id: function() { return 0; },
        session: function() { return 0; }
    };

    mainApp.config(['$httpProvider', function($httpProvider) {
        $httpProvider.interceptors.push('tokenInterceptor');
    }]);

    mainApp.factory('tokenInterceptor', ['$q', function($q) {
        return {
            'request': function(config) {
                var token = localStorage.getItem('token');
                if(token) {
                    config.headers.authorization = "Bearer " + token;
                }
                return config || $q.when(config);
            }
        };
    }]);

    mainApp.factory('ajax', ['$rootScope', '$http', 'status',
    function($rootScope, $http, status) {
        "use strict";

        function valid(data) {
            return data || {};
        }

        var ajax = {

            submit: function(fn, url, params, data, msg) {
                var token, q = Q.defer();
                status.busy(true);
                msg = msg || '';
                if(msg) {
                    status(msg);
                }
                if(url.indexOf('searchOptionsPopover.html') != -1) {
                    console.log("!");
                }
                // console.log(fn, url, "PARAMS", params, "DATA", data);
                $http({ method: fn,
                        url: '/api/' + url,
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
                    status.error('Error ' + msg + ': ' + response.statusText, 5);
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
