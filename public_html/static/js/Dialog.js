mainApp.factory('dialog', ['$rootScope', '$modal',
function($rootScope, $modal) {
    "use strict";

    function showModal(options) {
        var q = Q.defer();

        $modal.open({
            animation: true,
            templateUrl: '/static/html/dialogModal.html',
            controller: 'DialogModalInstanceController',
            resolve: {
                options: function () {
                    return options;
                }
            }
        }).result.then(function() {
            q.resolve(options.inputText);
        }, function() {
            q.reject();
        });
        return q.promise;
    }

    var dialog = {

        choose: function(banner, text, oktext, canceltext, okclass, cancelclass) {
            return showModal({
                    banner: banner,
                    text: text,
                    oktext: oktext || 'OK',
                    canceltext: canceltext || 'Cancel',
                    okclass: okclass || 'btn-primary',
                    cancelclass: cancelclass || (canceltext === null ? 'masked' : 'btn-warning'),
                    inputRequired: false
                });
        },

        inform: function(banner, text, oktext) {
            return showModal({
                    banner: banner,
                    text: text,
                    oktext: oktext || 'OK',
                    canceltext: null,
                    okclass: 'btn-primary',
                    cancelclass: 'masked',
                    inputRequired: false
                });
        },

        getText: function(banner, text, placeholder, label, initialValue, oktext, canceltext, okclass, cancelclass) {
            return showModal({
                    banner: banner,
                    text: text,
                    oktext: oktext || 'OK',
                    canceltext: canceltext || 'Cancel',
                    okclass: okclass || 'btn-primary',
                    cancelclass: cancelclass || (canceltext === null ? 'masked' : 'btn-warning'),
                    inputRequired: true,
                    inputType: 'text',
                    inputText: initialValue || '',
                    inputLabel: label,
                    inputPlaceholder: placeholder
                });
        }
    };

    return dialog;
}]);

