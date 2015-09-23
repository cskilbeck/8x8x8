(function() {
    "use strict";

    mainApp.controller('HelpController', ['$scope',
    function ($scope) {

        $scope.$emit('pane:loaded', 'help');

    }]);
})();
