(function() {

    mainApp.controller('HomeController', ['$scope', function($scope) {

        $scope.$emit('pane:loaded', 'home');

    }]);

})();