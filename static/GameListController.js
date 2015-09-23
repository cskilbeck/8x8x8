// DONE (chs): save/restore state of which rows in gamelist were expanded [kinda, it just started working... wierd...]

(function() {
    "use strict";

    var expanded = {};

    mainApp.controller('GameListController', ['$scope', '$routeParams', 'dialog', 'user', 'ajax', 'games',
    function ($scope, $routeParams, dialog, user, ajax, games) {

        $scope.$parent.pane = 'Games';
        $scope.games = [];
        $scope.user_id = user.id();

        $scope.$emit('pane:loaded', 'games');

        function getGames(force) {
            games.get(force).then(function(gameList) {
                $scope.games = gameList;
                $scope.$apply();
            });
        }

        $scope.star = function(index, score) {
            return index <= score ? 'yellow' : 'white';
        };

        $scope.timer = function(t) {
            return moment(t).fromNow();
        };

        $scope.$on('user:updated', function(msg, details) {
            $scope.user_id = user.id();
            getGames();
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
                    // TODO (chs): move this into the games service (and don't refresh games list)
                    ajax.post('/api/rename', {
                        game_id: game_id,
                        user_id: user.id(),
                        user_session: user.session(),
                        name: text })
                    .then($scope.refreshGameList);
            });
        };

        $scope.deleteIt = function(id, name) {
            dialog.choose("Delete " + name + "!?", "Do you really want to PERMANENTLY delete " + name + "? This action cannot be undone", "Yes, delete it", "No", 'btn-danger', 'btn-default')
            .then(function() {
                games.delete(id).then(getGames);
            });
        };

        $scope.playIt = function(id) {
            ajax.get('/api/source', { game_id: id } )
            .then(function(result) {
                $scope.$emit('play', result.game_source);
            });
        };

        getGames();

    }]);

})();

