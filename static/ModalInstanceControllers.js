(function() {
    "use strict";

    mainApp.controller('LoginModalInstanceController', ['$scope', '$modal', '$modalInstance', 'user', 'ajax',
    function ($scope, $modal, $modalInstance, user, ajax) {
        
        $scope.user = user;
        $scope.user.failed = false;

        $scope.ok = function () {
            ajax.post('/api/login', user, 'Logging in ' + user.email + '...')
            .then(function(result) {
                $scope.user.failed = false;
                $modalInstance.close(result);
                reportStatus(result.user_username + " signed in");
            }, function(xhr) {
                $scope.user.failed = true;
                $scope.$apply();
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        $scope.showRegistration = function () {
            $modalInstance.close({'registration': 'required'});
        };
    }]);

    mainApp.controller('RegisterModalInstanceController', ['$scope', '$modal', '$modalInstance', 'user', 'ajax',
    function ($scope, $modal, $modalInstance, user, ajax) {

        $scope.user = user;
        $scope.message = 'Please fill in all required fields';
        $scope.user.failed = false;

        $scope.ok = function () {

            $scope.user.failed = false;
            ajax.post('/api/register', $scope.user, 'Registering...')
            .then(function done(result) {
                $modalInstance.close(result);
            }, function fail(xhr) {
                $scope.message = xhr.statusText;
                $scope.user.failed = true;
                $scope.$apply();
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        $scope.passmatch = function() {
            return $scope.user.password === $scope.user.password2;
        };
    }]);

    mainApp.controller('EditorOptionsModalInstanceController', ['$scope', '$modal', '$modalInstance', 'options', '$rootScope',
    function ($scope, $modal, $modalInstance, options, $rootScope) {

        $scope.options = options;

        $scope.themes = [
            'Chrome',
            'Cobalt',
            'Monokai',
            'Eclipse',
            'TextMate'
        ];

        $scope.setTheme = function(t) {
            $scope.options.theme = $scope.themes[t];
            $rootScope.$broadcast('options', $scope.options);
        };

        $scope.ok = function() {
            $modalInstance.close($scope.options);
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };

    }]);

    mainApp.controller('DialogModalInstanceController', ['$scope', '$modal', '$modalInstance', 'options',
    function ($scope, $modal, $modalInstance, options) {

        $scope.options = options;

        $scope.ok = function() {
            $modalInstance.close();
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };

    }]);

})();

    