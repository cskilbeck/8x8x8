mainApp.controller('MainController', ['$scope', '$modal', 'user', 'ajax', '$rootScope',
function($scope, $modal, user, ajax, $rootScope) {
    "use strict";

    $scope.signInMessage = "Sign In";
    $scope.pane = '';
    $scope.status = '';
    $scope.isError = false;
    $scope.networkBusy = '';
    $scope.networkIcon = 'glyphicon-ok';
    $scope.user_id = user.id();
    $scope.showProfileButton = false;
    $scope.usernameMessage = "";
    $scope.signInClass = 'glyphicon glyphicon-log-in';
    $scope.showBackdropper = false;

    $scope.$on('showBackdropper', function() {
        $scope.showBackdropper = true;
    });

    $scope.$on('hideBackdropper', function() {
        $scope.showBackdropper = false;
    });

    $scope.backdropperClicked = function() {
        $scope.showBackdropper = false;
        $rootScope.$emit('backdropperClicked');
    };

    function clearNavBar() {
        $('.nav.navbar-nav > li').removeClass('active');
    }

    // $('.nav.navbar-nav > li').on('click', function(e) {
    //     clearNavbar();
    //     $(this).addClass('active');
    // });

    $('#homelink').on('click', function(e) {
        clearNavBar();
    });

    $scope.$on('pane:loaded', function(msg, pane) {
        clearNavBar();
        $('#nav' + pane).addClass('active');
    });

    clearNavBar();

    $scope.$on('user:updated', function(msg, details) {
        if(details.user_id !== 0) {
            $scope.usernameMessage = 'Signed in as ' + details.user_username;
            $scope.signInMessage = "Sign out";
            $scope.signInClass = 'glyphicon glyphicon-log-out';
            $scope.reportStatus("Welcome back " + details.user_username);
            $scope.showProfileButton = true;
            $scope.$applyAsync();
        }
        else {
            $scope.usernameMessage = '';
            $scope.signInMessage = "Sign In";
            $scope.signInClass = 'glyphicon glyphicon-log-in';
            $scope.reportStatus("Signed out");
            $scope.showProfileButton = false;
            $scope.$applyAsync();
        }
    });

    $scope.$on('status', function(e, msg) {
        $scope.reportStatus(msg);
    });

    $scope.$on('error', function(e, msg) {
        $scope.reportError(msg);
    });

    $scope.$on('network', function(e, msg) {
        $scope.setInProgress(msg);
    });

    // TODO (chs): possible race here between 'play' event and window loading (details might change in between, but does it matter?)

    $scope.toggleLogin = function() {
        if(user.isLoggedIn()) {
            user.logout().then($scope.apply);
        }
        else {
            user.login().then($scope.apply);
        }
    };

    $scope.reportError = function(text) {
        $scope.isError = true;
        $scope.status = text;
        $scope.$applyAsync();
    };

    $scope.reportStatus = function(text) {
        $scope.isError = false;
        $scope.status = text;
        $scope.$applyAsync();
    };

    $scope.setInProgress = function(p) {
        $scope.networkBusy = p;
        $scope.networkIcon = p ? 'glyphicon-repeat' : 'glyphicon-ok';
        $scope.$applyAsync();
    };

    user.refreshSession();
}]);

