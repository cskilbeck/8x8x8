(function() {
    "use strict";

    var paused,
        step,
        gameToPlay = null,
        forceToPlay = false,
        frame,
        frameWindow,
        frameMessages = [],
        running_game_id = 0,
        body,
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

    //////////////////////////////////////////////////////////////////////

    mainApp.controller('PlayerController', ['$scope', '$modal', '$routeParams', 'user', 'ajax', '$rootScope', 'gamelist', 'dialog', '$location', '$timeout', 'game', 'status',
    function($scope, $modal, $routeParams, user, ajax, $rootScope, gamelist, dialog, $location, $timeout, game, status) {

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
                return args[number] !== undefined ? args[number] : match;
            });
        }

        window.addEventListener('message', function(e) {
            var payload, message, data;
            try {
                payload = JSON.parse(e.data);
                frameWindow = e.source;
                $rootScope.$broadcast('frame:' + payload.message, payload.data);
            }
            catch(SyntaxError) {
            }
        });

        function postMessage(text, data) {
            var payload = JSON.stringify({ message: text, data: data });
            if(frameWindow) {
                frameWindow.postMessage(payload, "*");
            }
            else {
                frameMessages.push(payload);
            }
        }

        //////////////////////////////////////////////////////////////////////

        function playGame(game, force) {
            if(force || game.game_id !== running_game_id) {
                running_game_id = game.game_id;
                status.clearError();
                postMessage('clear-exception');
                postMessage('set-frame-delay', game.game_framerate + 1);
                postMessage('source', preScript + game.game_source + postScript);
                postMessage('unpause');
                postMessage('restart');
                status.focus(frameWindow);
                $scope.$applyAsync();
            }
        }

        $scope.$on('game:changed', function(e, m) {
            playGame(game, true);
            refreshRating();
        });

        //////////////////////////////////////////////////////////////////////

        $scope.by = function(g) {
            return g.game_id !== 0 ? "by " + (g.user_username || 'Anonymous') : "";
        };

        $scope.setFramerate = function(f) {
            game.game_framerate = f;
            postMessage('set-frame-delay', f + 1);
        };

        $scope.canShare = function(g) {
            return g.game_id > 0;
        };

        $scope.myGame = function(g) {
            return g.game_id > 0 && g.user_id == user.id();
        };

        $scope.checkText = function() {
            var r = /[^0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!\? \n\.\,''\"\:\;\$\*\(\)\-\+\=\_\[\]\{\}`\@\#\%\^\&\/]/;
            $scope.game.game_instructions = $scope.game.game_instructions.replace(r, '').substring(0, 240);
            $scope.game.game_title = $scope.game.game_title.replace(r, '').substring(0, 32);
        };

        // TODO (chs): fix these 4 functions for editing title & instructions, it's lamely done
        
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

        $scope.$on('frame:screenshot', function(m, e) {
            user.login("Sign in to save screenshot").then(function() {
                game.set_screenshot(e);
            });
        });

        $scope.takeScreenShot = function() {
            postMessage('screenshot');
        };

        $scope.canEditInstructions = function() {
            return game.editing;
        };

        $scope.filterkeys = function(event) {
            if(event.shiftKey === true && (event.keyCode === 188 || event.keyCode === 190)) {
                event.preventDefault();
            }
        };

        $scope.$on('frame:paused', function(m, e) {
            if(e) {
                $('#play').removeClass('fa-pause').addClass('fa-play');
            }
            else {
                $('#play').addClass('fa-pause').removeClass('fa-play');
            }
        });

        $scope.unpause = function() {
            postMessage('unpause');
        };

        $scope.pause = function() {
            postMessage('toggle-pause');
        };

        $scope.restart = function() {
            postMessage('restart');
        };

        $scope.step = function() {
            postMessage('step');
        };

        $scope.$on('play', function(e, dt) {
            if(dt.game) {
                playGame(game, dt.force);
                refreshRating();
            }
        });

        $scope.$on('frame:frame-loaded', function(m, data) {
            while(frameMessages.length > 0) {
                postMessage(frameMessages.shift());
            }
        });

        $scope.rating = function(index, g) {
            return (index <= g.hover_rating ? 'yellow' : 'white') + 'star fa fa-2x fa-star';
        };

        $scope.rateHover = function(index, g) {
            if(g.game_id && g.game_id !== 'new') {
                g.hover_rating = index;
            }
        };

        $scope.resetHover = function(g) {
            if(g.game_id && g.game_id !== 'new') {
                g.hover_rating = g.rating_stars;
            }
        };

        $scope.rateClick = function(index, g) {
            if(g.game_id) {
                var old = g.rating_stars;
                g.hover_rating = g.rating_stars = index;
                user.login("Sign in to rate this game")
                .then(
                    function() {
                        gamelist.rate(g, index)
                        .then(function(){
                            $rootScope.$apply();
                        });
                    },
                    function() {
                        g.hover_rating = g.rating_stars = old;
                    });
            }
        };

        //////////////////////////////////////////////////////////////////////
        // Sharing

        function twitterURL(game) {
            return format("https://twitter.com/intent/tweet?{0}", $.param({
                    text: format("{0}\nNice little game made with just 256 pixels!\n", game.game_title),
                    url: format("http://256pixels.net/play/{0}", game.game_id),
                    via: "256_Pixels"
                }));
        }

        $scope.shareTwitter = function(game) {
            window.open(twitterURL(game), "_blank", "height=400,width=600,status=no,toolbar=no");
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

        function refreshRating() {
            if(!user.isLoggedIn() || !game.game_id || isNaN(parseInt(game.game_id))) {
                game.rating_stars = game.hover_rating = 0;
                $scope.$applyAsync();
            }
            else if(rating_user != user.id() || rating_game != game.game_id) {
                game.getRating()
                .then(function(result) {
                    rating_user = user.id();
                    rating_game = game.game_id;
                    $scope.$applyAsync();
                });
            }
        }

        $scope.$on('user:updated', function() {
            refreshRating();
        });

        $scope.$on('user:logout', function() {
            refreshRating();
        });

    }]);
})();

