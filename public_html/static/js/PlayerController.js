(function() {
    "use strict";

    var paused,
        step,
        frameWindow,
        frameDocument,
        frameDelays = [ 1, 2, 3, 4, 5, 6],
        gameDetails,
        hidden = [
            'document', 'window', 'alert', 'parent', 'frames', 'frameElment',
            'history', 'fullScreen', 'innerHeight', 'innerWidth', 'length',
            'location', 'GlobalEventHandlers', 'WindowEventHandlers', 'opener',
            'performance', 'screen'
        ],
        preScript = 'function ClientScript(' + hidden.join() + ') { "use strict";\n',
        postScript = '; this.updateFunction = (typeof update === "function") ? update : null; };';

    mainApp.controller('PlayerController', ['$scope', '$modal', '$routeParams', 'user', 'ajax', '$rootScope', 'gamelist', 'dialog', '$location', '$timeout', 'game',
    function($scope, $modal, $routeParams, user, ajax, $rootScope, gamelist, dialog, $location, $timeout, game) {

        $scope.game = game;
        $scope.canEditInstructions = false;

        $scope.showScreenshotButton = function() {
            // console.log($scope.game.user_id);
            // console.log(user.id());
            return game.user_id === user.id();
        };

        window.reportRuntimeError = function(e) {
            $scope.reportError(e.message);
            $rootScope.$broadcast('runtimeerror', e);
            $scope.$applyAsync();
        };

        window.reportRuntimeErrorDirect = function(msg, line, column) {
            $scope.reportError(msg);
            $rootScope.$broadcast('editorGoto', {line: line, column: column, msg: msg});
            $scope.$applyAsync();
        };

        function frame() {
            return document.getElementById('gameFrame');
        }

        $scope.$on('settings', function(e, settings) {
            settings.framedelay = frameDelays[settings.game_framerate];
            frameWindow.settings(settings);
        });

        function safecall(fn) {
            if(typeof fn === 'function') {
                fn.apply(arguments);
            }
        }

        function safe(fn) {
            return function() {
                safecall(fn);
            };
        }

        $scope.$on('highlighter:activate', function(m, name) {
            switch(name) {
                case 'title':
                    $scope.editingTitle = true;
                    break;
                case 'instructions':
                    $scope.editingInstructions = true;
                    break;
            }
            $scope.$applyAsync();
        });

        $scope.$on('highlighter:dismiss', function(m, name) {
            switch(name) {
                case 'title':
                    $scope.editingTitle = false;
                    break;
                case 'instructions':
                    $scope.editingInstructions = false;
                    break;
            }
            $scope.$applyAsync();
        });

        $scope.instructionsEditorClass = function() {
            var c = 'instructionsTextarea';
            if($scope.editingInstructions) {
                c += ' editing';
            }
            else if($scope.canEditInstructions()) {
                c += ' editable';
            }
            return c;
        };

        $scope.titleEditorClass = function() {
            var c = 'gametitle';
            if($scope.editingTitle) {
                c += ' editing';
            }
            else if($scope.canEditInstructions()) {
                c += ' editable';
            }
            return c;
        };

        $scope.takeScreenShot = function() {

            user.login().then(function() {
                game.set_screenshot(frameWindow.screen());
            });
        };

        $scope.canEditInstructions = function() {
            return game.editing && game.user_id === user.id();
        };

        $scope.$on('play', function(e, game) {
            var body, o, n, i;
            if(game) {
                $scope.game = game;
                frameWindow = $('#gameFrame')[0].contentWindow;
                frameDocument = frameWindow.document;
                body = frameDocument.getElementsByTagName('body')[0];
                o = frameDocument.getElementById('clientscript');
                n = frameDocument.createElement('script');
                safecall(frameWindow.clearException());
                $scope.unpause();
                $rootScope.$broadcast('status', '');
                game.framedelay = frameDelays[game.game_framerate];
                body.removeChild(o);
                n.setAttribute('id', 'clientscript');
                n.innerHTML = preScript + game.game_source + postScript;
                frameWindow.game = game;
                body.appendChild(n);
                $('#gameFrame').focus();
                safecall(frameWindow.startIt(game));
            }
        });

        function controller(f) {
            return function() {
                f();
                if(frameWindow.isPaused()) {
                    $('#play')
                        .removeClass('glyphicon-pause')
                        .addClass('glyphicon-play');
                }
                else {
                    $('#play')
                        .addClass('glyphicon-pause')
                        .removeClass('glyphicon-play');
                }
            };
        }

        $scope.unpause = controller(function() {
            frameWindow.unpause();
        });

        $scope.pause = controller(function() {
            frameWindow.togglepause();
        });

        $scope.restart = controller(function() {
            frameWindow.restart();
        });

        $scope.step = controller(function() {
            frameWindow.step();
        });

    }]);
})();
