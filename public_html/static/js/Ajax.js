(function() {

    // TODO (chs): make it use angular $ajax
    // TODO (chs): make it return the result whether it fails or succeeds, let the caller extract the data

    var user = {
        id: function() { return 0; },
        session: function() { return 0; }
    };

    mainApp.factory('ajax', ['$rootScope', '$http',
    function($rootScope, $http) {
        "use strict";

        function setInProgress(p) {
            $rootScope.$broadcast('network', p);
        }

        function reportStatus(msg) {
            $rootScope.$broadcast('status', msg);
        }

        function reportError(msg) {
            $rootScope.$broadcast('error', msg);
        }

        var ajax = {

            reportStatus: function(s) {
                reportStatus(s);
            },

            reportError: function(e) {
                reportError(e);
            },

            set_user: function(u) {
                user = u;
            },

            get: function(url, params, progress, complete, fail) {
                var q = Q.defer();
                setInProgress(true);
                reportStatus(progress);
                if(typeof params === 'undefined') {
                    params = {};
                }
                if(typeof params.user_id === 'undefined') {
                    params.user_id = user.id();
                }
                if(typeof params.user_session === 'undefined') {
                    params.user_session = user.session();
                }
                console.log("GET", url, params);
                $http.get('http://256pixels.net/api/' + url, { params: params })
                .then(function(response) {
                    setInProgress(false);
                    reportStatus(complete || '');
                    q.resolve(response);
                }, function(response) {
                    setInProgress(false);
                    reportError((fail || 'Error:') + ' ' + response.statusText);
                    q.reject(response);
                });
                return q.promise;
            },

            post: function(url, data, progress, complete, fail) {
                var q = Q.defer();
                setInProgress(true);
                reportStatus(progress);
                if(typeof data.user_id === 'undefined') {
                    data.user_id = user.id();
                }
                if(typeof data.user_session === 'undefined') {
                    data.user_session = user.session();
                }
                console.log("POST", url, data);
                $http.post('http://256pixels.net/api/' + url, data, { data: data })
                .then(function(response) {
                    setInProgress(false);
                    reportStatus(complete || '');
                    q.resolve(response);
                }, function(response) {
                    setInProgress(false);
                    reportError((fail || 'Error:') + ' ' + response.statusText);
                    q.reject(response);
                });
                return q.promise;
            }
        };

        return ajax;

    }]);

})();
