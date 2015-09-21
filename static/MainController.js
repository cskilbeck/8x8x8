mainApp.controller('MainController', ['$scope', '$modal', 'user', 'ajax',
function($scope, $modal, user, ajax) {
    "use strict";

    var hidden = [
            'document', 'window', 'alert', 'parent', 'frames', 'frameElment',
            'history', 'fullScreen', 'innerHeight', 'innerWidth', 'length',
            'location', 'GlobalEventHandlers', 'WindowEventHandlers', 'opener',
            'performance', 'screen'
        ],
        preScript = 'function ClientScript(' + hidden.join() + ') { "use strict";\n',
        postScript = '; this.updateFunction = (typeof update === "function") ? update : null; };';

    $scope.signInMessage = "Sign In";
    $scope.pane = '';
    $scope.status = '';
    $scope.isError = false;
    $scope.networkBusy = '';
    $scope.networkIcon = 'glyphicon-ok';
    $scope.user_id = user.id();
    $scope.usernameMessage = "";

    $scope.$on('user:updated', function(msg, details) {
        if(details.user_id !== 0) {
            $scope.usernameMessage = 'Signed in as ' + details.user_username;
            $scope.signInMessage = "Sign out";
            $scope.reportStatus("Welcome back " + details.user_username);
        }
        else {
            $scope.usernameMessage = '';
            $scope.signInMessage = "Sign In";
            $scope.reportStatus("Signed out");
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

    $scope.$on('play', function(e, source) {
        var iframe = document.getElementById('gameFrame');
        $scope.reportStatus('');
        window.GameSource = preScript + source + postScript;
        iframe.src = '/static/frame.html';
        iframe.contentWindow.focus();
    });

    window.reportRuntimeError = function(e) {
        $scope.reportError(e.message);
        $scope.$broadcast('runtimeerror', e);
        $scope.$apply();
    };

    window.reportRuntimeErrorDirect = function(msg, line, column) {
        $scope.reportError(msg);
        $scope.$broadcast('editorGoto', {line: line, column: column, msg: msg});
        $scope.$apply();
    };

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
    };

    $scope.reportStatus = function(text) {
        $scope.isError = false;
        $scope.status = text;
    };

    $scope.setInProgress = function(p) {
        $scope.networkBusy = p;
        $scope.networkIcon = p ? 'glyphicon-repeat' : 'glyphicon-ok';
    };

    user.refreshSession().then(function() {
        $scope.$apply();
    });
}]);

