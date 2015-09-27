mainApp.controller('MainController', ['$scope', '$modal', 'user', 'ajax',
function($scope, $modal, user, ajax) {
    "use strict";

    var gameDetails = null,
        frameDelays = [ 1, 2, 3, 4, 5, 6],
        hidden = [
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
    $scope.showProfileButton = false;
    $scope.usernameMessage = "";
    $scope.signInClass = 'glyphicon glyphicon-log-in';

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

    function frame() {
        return document.getElementById('gameFrame');        
    }

    window.setupFrame = function() {
        var iframe = frame();
        if(gameDetails !== null) {
            gameDetails.framedelay = frameDelays[gameDetails.game_framerate];
            gameDetails.game_source = preScript + gameDetails.game_source + postScript;
            iframe.contentWindow.init(gameDetails);
            iframe.contentWindow.focus();
            gameDetails = null;
        }
    };

    $scope.$on('play', function(e, details) {
        $scope.reportStatus('');
        gameDetails = details;
        frame().src = '/static/html/frame.html';
    });

    $scope.$on('settings', function(e, settings) {
        // console.log("MainController ==>");
        // console.log(settings);
        settings.framedelay = frameDelays[settings.game_framerate];
        frame().contentWindow.settings(settings);
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

    function hex(a) {
        var i, s = '';
        for(i in a) {
            s += (a[i] | 0x10).toString(16).substr(-1);
        }
        return s;
    }

    // screen is an array of 256 numbers which are all 0-15
    window.takeScreenShot = function(screen, gameid) {
        user.login()
        .then(function() {
            return ajax.post('/api/screenshot', {
                        user_id: user.id(),
                        user_session: user.session(),
                        screen: hex(screen),
                        game_id: gameid
                    });
            })
        .then(function(result) {
            $scope.reportStatus("Screenshot saved");
        });
    };

    user.refreshSession();
}]);

