mainApp.controller('MainController', ['$scope', '$modal', 'user', 'ajax', '$rootScope', 'status',
function($scope, $modal, user, ajax, $rootScope, status) {
    "use strict";

    $scope.signInMessage = "Sign In";
    $scope.pane = '';
    $scope.status = '';
    $scope.isError = false;
    $scope.networkBusy = '';
    $scope.networkIcon = 'fa-check';
    $scope.user_id = user.id();
    $scope.showProfileButton = false;
    $scope.usernameMessage = "";
    $scope.signInClass = '';
    $scope.showBackdropper = false;

    function clearNavBar() {
        $('.nav.navbar-nav > li').removeClass('active');
    }

    $scope.$on('showBackdropper', function() {
        $scope.showBackdropper = true;
    });

    $scope.$on('hideBackdropper', function() {
        $scope.showBackdropper = false;
    });

    $scope.backdropperClicked = function() {
        $scope.showBackdropper = false;
    };

    $('#homelink').on('click', clearNavBar);

    $scope.$on('pane:loaded', function(msg, pane) {
        clearNavBar();
        $('#nav' + pane).addClass('active');
    });

    $scope.$on('user:updated', function(msg, details) {
        if(details.user_id !== 0) {
            $scope.usernameMessage = 'Signed in as ' + details.user_username;
            $scope.signInMessage = "Sign out";
            $scope.signInClass = '';
            status("Welcome back " + details.user_username);
            $scope.showProfileButton = true;
            $scope.$applyAsync();
        }
    });

    $scope.$on('user:logout', function(msg) {
        $scope.usernameMessage = '';
        $scope.signInMessage = "Sign In";
        $scope.signInClass = '';
        status("Signed out");
        $scope.showProfileButton = false;
        $scope.$applyAsync();
    });

    $scope.$on('status', function(e, text) {
        $scope.isError = false;
        if(typeof text === 'string' && text.length > 0) {
            $scope.status = text;
        }
        $scope.$applyAsync();
    });

    $scope.$on('error', function(e, text) {
        $scope.isError = true;
        if(typeof text === 'string' && text.length > 0) {
            $scope.status = text;
        }
        $scope.$applyAsync();
    });

    $scope.$on('network', function(e, b) {
        $scope.networkBusy = b;
        $scope.networkIcon = b ? 'fa-refresh' : 'fa-check';
        $scope.$applyAsync();
    });

    $scope.toggleLogin = function() {
        if(user.isLoggedIn()) {
            user.logout().then($scope.apply);
        }
        else {
            user.login().then($scope.apply);
        }
    };

    clearNavBar();
    user.refreshSession();

}]);

