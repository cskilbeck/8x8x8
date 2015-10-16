mainApp.factory('dialog', ['$rootScope', '$uibModal',
function($rootScope, $uibModal) {
    "use strict";

    function showModal(options, size) {
        var q = Q.defer(),
            s = size || 'medium';

        $uibModal.open({
            animation: true,
            templateUrl: '/static/html/dialogModal.html',
            controller: 'DialogModalInstanceController',
            size: s,
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
                }, this.size);
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
                }, this.size);
        },

        showText: function(banner, text, label) {
            return showModal({
                    banner: banner,
                    text: '',
                    oktext: 'OK',
                    canceltext: null,
                    okclass: 'btn-primary',
                    cancelclass: 'masked',
                    inputRequired: true,
                    inputType: 'text',
                    inputText: text,
                    inputLabel: label,
                    inputPlaceholder: ''
                }, this.size);
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
        },

        large: {
            choose: function() { return dialog.choose.apply({size: 'large'}, arguments); },
            inform: function() { return dialog.inform.apply({size: 'large'}, arguments); },
            showText: function() { return dialog.showText.apply({size: 'large'}, arguments); },
            getText: function() { return dialog.getText.apply({size: 'large'}, arguments); }
        },

        medium: {
            choose: function() { return dialog.choose.apply({size: 'medium'}, arguments); },
            inform: function() { return dialog.inform.apply({size: 'medium'}, arguments); },
            showText: function() { return dialog.showText.apply({size: 'medium'}, arguments); },
            getText: function() { return dialog.getText.apply({size: 'medium'}, arguments); }
        },

        small: {
            choose: function() { return dialog.choose.apply({size: 'small'}, arguments); },
            inform: function() { return dialog.inform.apply({size: 'small'}, arguments); },
            showText: function() { return dialog.showText.apply({size: 'small'}, arguments); },
            getText: function() { return dialog.getText.apply({size: 'small'}, arguments); }
        },
    };

    return dialog;
}]);

