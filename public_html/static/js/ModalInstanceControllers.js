(function() {
    "use strict";

    mainApp.controller('LoginModalInstanceController', ['$scope', '$modal', '$modalInstance', 'user', 'ajax',
    function ($scope, $modal, $modalInstance, user, ajax) {

        $scope.user = user;
        $scope.user.failed = false;

        $scope.ok = function () {
            ajax.post('login', user, 'Logging in ' + user.email + '...')
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
            ajax.post('register', $scope.user, 'Registering...')
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
        };

        $scope.$watch(function(scope) {
            return scope.options;
        }, function(newValue, oldValue) {
            $rootScope.$broadcast('options', newValue);
        }, true);

        $scope.ok = function() {
            $modalInstance.close($scope.options);
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };

    }]);

    mainApp.controller('DialogModalInstanceController', ['$scope', '$modal', '$modalInstance', 'options', '$timeout',
    function ($scope, $modal, $modalInstance, options, $timeout) {

        $scope.options = options;

        // DONE (chs): make input field focus on dialog show work!? [$modal was focusing element 0 in a requestAnimationFrame after the animation]
        $modalInstance.opened.then(function() {
            $timeout(function() {
                $('#input').focus();
            }, 350);
        });

        $scope.ok = function() {
            $modalInstance.close();
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };

    }]);

    mainApp.controller('GameSettingsModalInstanceController', ['$scope', '$modal', '$modalInstance', 'settings', '$timeout', '$rootScope',
    function($scope, $modal, $modalInstance, settings, $timeout, $rootScope) {

        $scope.frameratenames = [
            '60 - fastest',
            '30 - fast',
            '20 - normal',
            '15 - slow',
            '12 - slower',
            '10 - slowest'
        ];

        $scope.settings = settings;

        $scope.setFramerate = function(f) {
            $scope.settings.game_framerate = f;
            $rootScope.$broadcast('settings', $scope.settings);
        };

        $scope.ok = function() {
            $modalInstance.close($scope.settings);
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };

    }]);

})();

