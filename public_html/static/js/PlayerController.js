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

    mainApp.controller('PlayerController', ['$scope', '$modal', '$routeParams', 'user', 'ajax', '$rootScope', 'games', 'dialog', '$location', '$timeout',
    function($scope, $modal, $routeParams, user, ajax, $rootScope, games, dialog, $location, $timeout) {

        $scope.game = {
            game_title: 'ABC',
            game_instructions: 'ABC',
            game_id: 0,
            user_id: 0
        };
        $scope.editingInstructions = false;
        $scope.canEditInstructions = false;

        $scope.showScreenshotButton = function() {
            return $scope.game.user_id === user.id();
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

        function hex(a) {
            var i, s = '';
            for(i in a) {
                s += (a[i] | 0x10).toString(16).substr(-1);
            }
            return s;
        }

        $scope.startEditingInstructions = function() {
            if($scope.canEditInstructions) {
                $scope.editingInstructions = $scope.game.user_id === user.id();
                $scope.$emit('showBackdropper');
            }
        };

        $scope.$on('backdropperClicked', function() {
            console.log("!");
            $scope.editingInstructions = false;
        });

        $scope.finishEditingInstructions = function() {
            $scope.$emit('hideBackdropper');
            $scope.editingInstructions = false;
        };

        $scope.instructionsEditorClass = function() {
            return $scope.editingInstructions ? 'editing' : '';
        };

        $scope.takeScreenShot = function() {
            user.login()
            .then(function() {
                return ajax.post('/api/screenshot', {
                            user_id: user.id(),
                            user_session: user.session(),
                            screen: hex(frameWindow.screen()),
                            game_id: $scope.game.game_id
                        });
                })
            .then(function(result) {
                $scope.reportStatus("Screenshot saved");
            });
        };


        $scope.$on('play', function(e, game) {
            var body, o, n, i;

            if(game) {
                $scope.canEditInstructions = game.user_id === user.id();
                $scope.game = game;
                frameWindow = $('#gameFrame')[0].contentWindow;
                frameDocument = frameWindow.document;
                body = frameDocument.getElementsByTagName('body')[0];
                o = frameDocument.getElementById('clientscript');
                n = frameDocument.createElement('script');

                frameWindow.clearException();
                $scope.unpause();
                $scope.reportStatus('');
                game.framedelay = frameDelays[game.game_framerate];
                body.removeChild(o);
                n.setAttribute('id', 'clientscript');
                n.innerHTML = preScript + game.game_source + postScript;
                frameWindow.game = game;
                body.appendChild(n);
                $('#gameFrame').focus();
                frameWindow.startIt(game);
            }
        });

        // sigh, bored of forgetting to call this

        function controller(f) {
            return function() {
                f();
                if(frameWindow.isPaused()) {
                    $('#play').removeClass('glyphicon-pause');
                    $('#play').addClass('glyphicon-play');
                }
                else {
                    $('#play').addClass('glyphicon-pause');
                    $('#play').removeClass('glyphicon-play');
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
