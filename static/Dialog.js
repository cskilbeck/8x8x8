mainApp.factory('dialog', ['$rootScope', '$modal',
function($rootScope, $modal) {
    "use strict";

    function dialog(banner, text, oktext, canceltext, okclass, cancelclass) {
        var options = {
                banner: banner,
                text: text,
                oktext: oktext,
                canceltext: canceltext,
                okclass: okclass || 'btn-primary',
                cancelclass: cancelclass || 'btn-warning'
            },
            q = Q.defer();
        $modal.open({
            animation: true,
            templateUrl: 'dialogModal.html',
            controller: 'DialogModalInstanceController',
            resolve: {
                options: function () {
                    return options;
                }
            }
        }).result.then(function() {
            q.resolve(true);
        }, function() {
            q.resolve(false);
        });
        return q.promise;
    }
    return dialog;
}]);

