// DONE (chs): save/restore state of which rows in gamelist were expanded [kinda, it just started working... wierd...]

(function() {
    "use strict";

    var expanded = {};

    mainApp.controller('GameListController', ['$scope', '$routeParams', 'dialog', 'user', 'ajax', 'gamelist', '$rootScope', 'game',
    function ($scope, $routeParams, dialog, user, ajax, gamelist, $rootScope, game) {

        $scope.$parent.pane = 'Games';
        $scope.games = [];
        $scope.user_id = user.id();

        $scope.$emit('pane:loaded', 'games');

        $('#refreshButton').tooltip();

        game.editing = false;

        function getGames(force) {
            var q = Q.defer();
            gamelist.getlist(force).then(function(gameList) {
                $scope.games = gameList;
                $scope.$apply();
                q.resolve(gameList);
            }, function(xhr) {
                q.reject(xhr);
            });
            return q.promise;
        }

        $scope.star = function(index, g) {
            return index <= Math.floor(g.game_rating + 0.25) ? 'yellow' : 'white';  // slightly generous (allow a game to be a 5 which isn't 100% 5 rated)
        };

        $scope.rating = function(index, g) {
            return index <= g.hover_rating ? 'yellow' : 'white';
        };

        $scope.rateHover = function(index, g) {
            g.hover_rating = index;
        };

        $scope.resetHover = function(g) {
            g.hover_rating = g.rating_stars;
        };

        $scope.rateClick = function(index, g) {
            var old = g.rating_stars;
            g.hover_rating = g.rating_stars = index;
            user.login()
            .then(
                function() {
                    return gamelist.rate(g, index); },
                function() {
                    g.hover_rating = g.rating_stars = old;
                })
            .then(getGames);
        };

        $scope.timer = function(t) {
            return moment(t).fromNow();
        };

        $scope.screen = function(g) {
            return '/screen/' + g.game_id;
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
            getGames(true);
        };

        $scope.yoink = function(index, gameID) {
            var ex = !$('#row' + index).hasClass('in');
            if(!ex) {
                delete expanded[gameID];
            }
            else {
                expanded[gameID] = true;
            }
        };

        $scope.expanded = function(id) {
            return expanded[id];
        };

        $scope.rename = function(game_id, game_name) {
            dialog.getText("Rename " + game_name, '', 'New Name', 'New name', game_name)
            .then(function(text) {
                if(text !== game_name) {
                    // TODO (chs): move this into the gamelist service (and don't refresh gamelist)
                    ajax.post('/api/rename', {
                        game_id: game_id,
                        user_id: user.id(),
                        user_session: user.session(),
                        name: text })
                    .then($scope.refreshGameList);
                }
            });
        };

        $scope.deleteIt = function(id, name) {
            dialog.choose("Delete " + name + "!?", "Do you really want to PERMANENTLY delete " + name + "? This action cannot be undone", "Yes, delete it", "No", 'btn-danger', 'btn-default')
            .then(function() {
                gamelist.delete(id).then(getGames);
            });
        };

        $scope.playIt = function(id) {
            gamelist.get(id)
            .then(function(result) {
                result.editing = false;
                game.play(result);
            });
        };

        getGames();

    }]);

})();

