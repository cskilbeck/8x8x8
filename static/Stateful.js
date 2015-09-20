mainApp.directive('stateful',
function() {
    "use strict";

    return {
        link: function($scope, elem, attrs) {
            $scope.$on('$locationChangeStart', function(event, next, current) {
                if (!$scope.saveState()) {
                    event.preventDefault();
                }
            });
        }
    };
});

