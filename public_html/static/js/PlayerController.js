(function() {
    "use strict";

    var paused,
        step,
        frameWindow,
        frameDocument,
        rating_user = 0,
        rating_game = 0,
        frameDelays = [ 1, 2, 3, 4, 5, 6],
        gameDetails,
        hidden = [
            'document', 'window', 'alert', 'parent', 'frames', 'frameElment',
            'history', 'fullScreen', 'innerHeight', 'innerWidth', 'length',
            'location', 'GlobalEventHandlers', 'WindowEventHandlers', 'opener',
            'performance', 'screen'
        ],
        preScript = 'function ClientScript(' + hidden.join() + ') { "use strict";\n',
        postScript = ';this.$updateFunction = typeof update === "function" ? update : null; };';

    mainApp.controller('PlayerController', ['$scope', '$modal', '$routeParams', 'user', 'ajax', '$rootScope', 'gamelist', 'dialog', '$location', '$timeout', 'game',
    function($scope, $modal, $routeParams, user, ajax, $rootScope, gamelist, dialog, $location, $timeout, game) {

        $scope.game = game;
        $scope.canEditInstructions = false;
        $scope.frameratenames = [
            '60 - fastest',
            '30 - fast',
            '20 - normal',
            '15 - slow',
            '12 - slower',
            '10 - slowest'
        ];


        function format(fmt) {
            var args = Array.prototype.slice.call(arguments, 1);
            return fmt.replace(/{(\d+)}/g, function(match, number) {
                return typeof args[number] !== 'undefined' ? args[number] : match;
            });
        }

        function twitterURL(game) {
            return format("https://twitter.com/intent/tweet?{0}", $.param({
                    text: format("{0}\nNice little game made with just 256 pixels!\n", game.game_title),
                    url: format("http://256pixels.net/play/{0}", game.game_id),
                    via: "@256_Pixels"
                }));
        }

        $scope.shareTwitter = function(game) {
            window.open(twitterURL(game), "_blank", "height=400,width=600,status=no,toolbar=no");
        };

        $scope.setFramerate = function(f) {
            game.game_framerate = f;
            frameWindow.setFrameDelay(f + 1);
        };

        $scope.showScreenshotButton = function() {
            return game.user_id === user.id();
        };

        $scope.checkText = function() {
            var r = /[^0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!\? \n\.\,''\"\:\;\$\*\(\)\-\+\=\_\[\]\{\}`\@\#\%\^\&\/]/;
            $scope.game.game_instructions = $scope.game.game_instructions.replace(r, '').substring(0, 240);
            $scope.game.game_title = $scope.game.game_title.replace(r, '').substring(0, 32);
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

        $scope.showRating = function(g) {
            return g.game_id !== 0;
        };

        $scope.rating = function(index, g) {
            return (index <= g.hover_rating ? 'yellow' : 'white') + 'star fa fa-2x fa-star';
        };

        $scope.rateHover = function(index, g) {
            if(g.game_id) {
                g.hover_rating = index;
            }
        };

        $scope.resetHover = function(g) {
            if(g.game_id) {
                g.hover_rating = g.rating_stars;
            }
        };

        $scope.rateClick = function(index, g) {
            if(g.game_id) {
                var old = g.rating_stars;
                g.hover_rating = g.rating_stars = index;
                user.login()
                .then(
                    function() {
                        return gamelist.rate(g, index);
                    },
                    function() {
                        g.hover_rating = g.rating_stars = old;
                    })
                .then(
                    function() {
                        return gamelist.refreshOne(g.game_id);
                    })
                .then(
                    function() {
                        $rootScope.$broadcast('gamerated');
                    });
            }
        };

        $scope.shareIt = function(game) {
            FB.ui({
                method: 'feed',
                name: game.game_title,
                link: 'http://256pixels.net/play/' + game.game_id,
                picture: 'http://256pixels.net/screen/' + game.game_id,
                description: (game.game_instructions || '') + '\n\n\n',
                caption: (game.user_id === user.id() ? 'I made a' : 'Check out this') + ' game which uses just 256 pixels!'
            });
        };

        $scope.tweetText = function(game) {
            return "Check out this nice little 256 Pixel game: " + game.game_title;
        };

        $scope.tweetURL = function(game) {
            return "http://256pixels.net/play/" + game.game_id;
        };

        $scope.tweet = function(game) {
            return "https://twitter.com/intent/tweet";
        };

        function frame() {
            return document.getElementById('gameFrame');
        }

        function refreshRating() {
            if(!user.isLoggedIn()) {
            }
            else if(!game.game_id) {
            }
            else if(rating_user == user.id() && rating_game == game.game_id) {
            }
            else if(isNaN(parseInt(game.game_id))) {
            }
            else {
                game.getRating()
                .then(function(result) {
                    rating_user = user.id();
                    rating_game = game.game_id;
                    $scope.$applyAsync();
                }, function() {
                });
            }
        }

        $scope.$on('user:updated', function() {
            refreshRating();
        });

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
                game.set_screenshot(frameWindow.getscreen());
            });
        };

        $scope.canEditInstructions = function() {
            return game.editing && game.user_id === user.id();
        };

        function safe(fn) {
            return function() {
                safecall(fn);
            };
        }

        function safecall(fn) {
            if(typeof fn === 'function') {
                fn.apply(arguments);
            }
        }

        function controller(f) {
            return function() {
                f();
                if(frameWindow.isPaused()) {
                    $('#play')
                        .removeClass('fa-pause')
                        .addClass('fa-play');
                }
                else {
                    $('#play')
                        .addClass('fa-pause')
                        .removeClass('fa-play');
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

        $scope.$on('play', function(e, game) {
            var body, o, n, i;
            if(game) {
                $scope.game = game;
                frameWindow = $('#gameFrame')[0].contentWindow;
                frameDocument = frameWindow.document;
                body = frameDocument.getElementsByTagName('body')[0];
                o = frameDocument.getElementById('clientscript');
                n = frameDocument.createElement('script');
                safecall(frameWindow.clearException);
                $scope.unpause();
                $rootScope.$broadcast('status', '');
                game.frameDelay = frameDelays[game.game_framerate];
                body.removeChild(o);
                n.setAttribute('id', 'clientscript');
                n.innerHTML = preScript + game.game_source + postScript;
                body.appendChild(n);
                $('#gameFrame').focus();
                frameWindow.game = game;
                safecall(frameWindow.startIt);
                refreshRating();
            }
        });

    }]);
})();
