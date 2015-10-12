(function() {
    "use strict";

    mainApp.controller('LoginModalInstanceController', ['$scope', '$modal', '$modalInstance', 'details', 'ajax', 'user', 'status', '$timeout',
    function ($scope, $modal, $modalInstance, details, ajax, user, status, $timeout) {

        $scope.details = details;
        $scope.details.failed = false;
        $scope.loginInProgress = false;

        $timeout(function() {
            status.focus($('#email').focus());
        }, 350);

        $scope.ok = function () {
            $scope.loginInProgress = true;
            $scope.details.failed = false;
            user.dologin($scope.details)
            .then(function(data) {
                $modalInstance.close(data);
                status(user.name() + " signed in");
            }, function(response) {
                $scope.loginInProgress = false;
                status.error('Login failed');
                $scope.details.failed = true;
                $scope.$apply();
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancelled');
        };

        $scope.showRegistration = function () {
            $modalInstance.dismiss('registration-required');
        };

        $scope.resetpw = function() {
            $scope.loginInProgress = true;
            ajax.get('resetpw', { email: details.email })
            .then(function(response) {
                $modalInstance.dismiss('resetpassword-complete');
            }, function(response) {
                $modalInstance.dismiss('resetpassword-failed');
            });
        };

    }]);

    mainApp.controller('RegisterModalInstanceController', ['$scope', '$modal', '$modalInstance', 'details', 'ajax', 'user', '$timeout', 'status',
    function ($scope, $modal, $modalInstance, details, ajax, user, $timeout, status) {

        $scope.details = details;
        $scope.message = 'Fill in required fields...';
        $scope.registrationInProgress = false;
        $scope.details.failed = false;

        // details.needOldPassword - true if showProfilebutton, false if register or resetpassword
        // details.changePassword - true if register or resetpassword or

        $timeout(function() {
            status.focus($('#username'));
        }, 350);

        $scope.resetpw = function() {
            $scope.loginInProgress = true;
            ajax.get('resetpw', { email: details.email })
            .then(function(response) {
                $modalInstance.dismiss('resetpassword-complete');
            }, function(response) {
                $modalInstance.dismiss('resetpassword-failed');
            });
        };

        $scope.ok = function () {

            $scope.registrationInProgress = true;

            $scope.details.failed = false;

            if(!$scope.details.changePassword) {
                delete $scope.details.password;
                delete $scope.details.password2;
            }

            if(!$scope.details.editingProfile) {
                delete $scope.details.oldpassword;
            }

            user.register($scope.details)
            .then(function(response) {
                $modalInstance.close(response.data);
            }, function(response) {
                $scope.registrationInProgress = false;
                $scope.message = response.statusText;
                $scope.details.failed = true;
                $scope.$apply();
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancelled');
        };

        $scope.passmatch = function() {
            return $scope.details.password === $scope.details.password2;
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
        // $modalInstance.opened.then(function() {
        //     $timeout(function() {
        //         status.focus($('#input'));
        //     }, 350);
        // });

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

