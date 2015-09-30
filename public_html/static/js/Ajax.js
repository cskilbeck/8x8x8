(function() {

    // TODO (chs): make it use angular $ajax
    // TODO (chs): make it return the result whether it fails or succeeds, let the caller extract the data

    var user = {
        id: function() { return 0; },
        session: function() { return 0; }
    };

    mainApp.factory('ajax', ['$rootScope', 
    function($rootScope) {
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

        function doAjax(func, url, data, progress, complete, fail) {
            var q = Q.defer();
            setInProgress(true);
            reportStatus(progress);
            if(typeof data.user_id == 'undefined') {
                data.user_id = user.id();
            }
            if(typeof data.user_session == 'undefined') {
                data.user_session = user.session();
            }
            func('/api/' + url, data)
            .done(function(result) {
                setInProgress(false);
                reportStatus(complete || '');
                $rootScope.$apply();
                q.resolve(result);
            })
            .fail(function(xhr) {
                setInProgress(false);
                reportError((fail || 'Error:') + ' ' + xhr.statusText);
                $rootScope.$apply();
                q.reject(xhr);
            });
            return q.promise;
        }

        var ajax = {

            set_user: function(u) {
                user = u;
            },

            get: function(url, data, progress, complete, fail) {
                return doAjax($.get, url, data, progress, complete, fail);
            },

            post: function(url, data, progress, complete, fail) {
                return doAjax($.post, url, data, progress, complete, fail);
            }
        };

        return ajax;

    }]);

})();
