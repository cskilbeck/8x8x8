mainApp.controller('MainController', ['$scope', '$modal', 'user', 'ajax', '$rootScope', 'status', '$location', 'game',
function($scope, $modal, user, ajax, $rootScope, status, $location, game) {
    "use strict";

    $scope.status = status;
    $scope.signInMessage = "Sign In";
    $scope.pane = '';
    $scope.user_id = user.id();
    $scope.showProfileButton = false;
    $scope.usernameMessage = "";
    $scope.signInClass = '';
    $scope.showBackdropper = false;

    function clearNavBar() {
        $('.nav.navbar-nav > li').removeClass('active');
    }

    $scope.newGame = function() {
        game.reset();
        $location.search('page', null);
        $location.path('/edit/new');
    };

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
        }
    });

    $scope.$on('user:logout', function(msg) {
        $scope.usernameMessage = '';
        $scope.signInMessage = "Sign In";
        $scope.signInClass = '';
        status("Signed out");
        $scope.showProfileButton = false;
    });

    $scope.toggleLogin = function() {
        if(user.isLoggedIn()) {
            user.logout().then($scope.apply);
        }
        else {
            user.login().then($scope.apply);
        }
    };

    $scope.editProfile = function() {
        if(user.isLoggedIn()) { // just in case
            user.editProfile().then($scope.apply);
        }
    };

    clearNavBar();
    user.refreshSession($location.search());

}]);