// DONE (chs): save/restore state of which rows in gamelist were expanded [kinda, it just started working... wierd...]

(function() {
    "use strict";

    mainApp.controller('GameListController', ['$scope', '$routeParams', 'dialog', 'user', 'ajax', 'games',
    function ($scope, $routeParams, dialog, user, ajax, games) {

        $scope.$parent.pane = 'Games';
        $scope.games = [];
        $scope.user_id = user.id();

        function getGames() {
            games.get().then(function(gameList) {
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
            games.reset();
            getGames();
        };

        $scope.deleteIt = function(id, name) {
            dialog("Delete " + name + "!?", "Do you really want to delete " + name + "? This action cannot be undone", "Yes, delete it permanently", "No", 'btn-danger', 'btn-default')
            .then(function(result) {
                if(result) {
                    games.delete(id).then(getGames);
                }
            });
        };

        $scope.playIt = function(id) {
            ajax.get('/api/source', { game_id: id } )
            .then(function(result) {
                $scope.$emit('play', result.source);
            });
        };

        getGames();

    }]);

})();

