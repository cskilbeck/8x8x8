mainApp.factory('ajax', ['$rootScope',
function($rootScope){
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
        func(url, data)
        .done(function(result) {
            setInProgress(false);
            reportStatus(complete);
            $rootScope.$apply();
            q.resolve(result);
        })
        .fail(function(xhr) {
            setInProgress(false);
            reportError(fail || xhr.statusText);
            $rootScope.$apply();
            q.reject(xhr);
        });
        return q.promise;
    }

    var ajax = {

        get: function(url, data, progress, complete, fail) {
            return doAjax($.get, url, data, progress, complete, fail);
        },

        post: function(url, data, progress, complete, fail) {
            return doAjax($.post, url, data, progress, complete, fail);
        }
    };

    return ajax;

}]);
