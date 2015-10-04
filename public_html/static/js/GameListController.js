// DONE (chs): save/restore state of which rows in gamelist were expanded [kinda, it just started working... wierd...]

(function() {
    "use strict";

    var expanded = {};

    mainApp.controller('GameListController', ['$scope', '$routeParams', 'dialog', 'user', 'ajax', 'gamelist', '$rootScope', 'game', '$location',
    function ($scope, $routeParams, dialog, user, ajax, gamelist, $rootScope, game, $location) {

        var unique = Date.now().toString();

        $scope.$parent.pane = 'Games';
        $scope.games = [];
        $scope.user_id = user.id();

        $scope.$emit('pane:loaded', 'games');

        $('#refreshButton').tooltip();

        function getGames(force) {
            var q = Q.defer();
            gamelist.getlist(force).then(function(gameList) {
                $scope.games = gameList;
                $scope.$applyAsync();
                q.resolve(gameList);
            }, function(response) {
                q.reject(response);
            });
            return q.promise;
        }

        $scope.timer = function(t) {
            return moment(t).fromNow();
        };

        $scope.screen = function(g) {
            return '/screen/' + g.game_id;
        };

        $scope.star = function(index, g) {
            return index <= Math.floor(g.game_rating + 0.25) ? 'yellow' : 'white';  // slightly generous (allow a game to be a 5 which isn't 100% 5 rated)
        };

        $scope.shareLink = function(game) {
            dialog.showText("Here's a link to '" + game.game_title + "'", 'http://256pixels.net/play/' + game.game_id, 'Link:');
        };

        $scope.shareIt = function(game) {
            FB.ui({
                method: 'feed',
                name: game.game_title,
                link: 'http://256pixels.net/play/' + game.game_id,
                picture: 'http://256pixels.net/screen/' + game.game_id,
                description: (game.game_instructions || '') + '\n\n\n',
                caption: (game.user_id === user.id() ? 'I made a' : 'Check out this') + 'game which uses just 256 pixels!'
            });
        };

        $scope.$on('user:updated', function(msg, details) {
            $scope.user_id = user.id();
            getGames(true);
        });

        $scope.refreshGameList = function() {
            return getGames(true);
        };

        $scope.expanded = function(id) {
            return expanded[id];
        };

        $scope.rename = function(game_id, game_name) {
            dialog.getText("Rename " + game_name, '', 'New Name', 'New name', game_name)
            .then(function(text) {
                if(text !== game_name) {
                    // TODO (chs): move this into the gamelist service (and don't refresh gamelist)
                    ajax.post('rename', {
                        game_id: game_id,
                        name: text })
                    .then($scope.refreshGameList);
                }
            });
        };

        $scope.$on('gamerated', function() {
            $scope.$apply();
        });

        $scope.screenshot = function(g) {
            return gamelist.getscreenshot(g.game_id);
        };

        $scope.playIt = function(event, id) {
            gamelist.get(id)
            .then(function(result) {
                result.editing = false;
                game.play(result, true);
            });
        };

        $scope.editIt = function(event, id) {
            $location.path('/edit/' + id);
            event.preventDefault();
        };

        $scope.clicked = function(index) {
            $('#game_' + index).removeClass('dropshadow');
        };

        $scope.unclicked = function(index) {
            $('#game_' + index).addClass('dropshadow');
        };

        getGames();

    }]);

})();

