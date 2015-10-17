(function() {
    "use strict";

    var orders = [
            { sql: 'game_rating desc', text: "Rating" },
            { sql: 'game_lastsaved desc', text: "Saved" },
            { sql: 'game_created desc', text: 'Created' },
            { sql: 'game_rating desc', text: 'Played' }      // TODO (chs) implement game_playcount
        ],
        oldOptions = {};

    mainApp.controller('GameListController', ['$scope', '$routeParams', 'dialog', 'user', 'ajax', 'gamelist', '$rootScope', 'game', '$location', '$timeout', 'util', '$templateCache',
    function ($scope, $routeParams, dialog, user, ajax, gamelist, $rootScope, game, $location, $timeout, util, $templateCache) {

        var timer, cp = $location.search();
        $scope.$parent.pane = 'Games';
        $scope.games = [];
        $scope.user_id = user.id();
        $scope.pages = [];
        $scope.currentPage = parseInt(cp.page, 10) || 1;
        $scope.results = '';
        $scope.orders = orders;

        $scope.options = angular.extend({
            text: '',
            orderBy: 0,
            justMyGames: 0,
            pageSize: 10,
            expanded: 0,
            viewStyle:mainApp.isMobile ? 'list' : 'box'
        }, util.load('options') || {});

        $scope.totalGames = $scope.currentPage * $scope.options.pageSize - 1;   // TODO (chs) fix this grotty hack to stop the paginator resetting the page to 1

        $scope.$watch('options.viewStyle', function(n, o) {
            $('.cloakable').hide();     // hide gamelist while $digests are in progress
            $timeout(function() {
                $('.cloakable').show(); // to avoid ugly flexbox layout flickering
            }, 200);                    // EDGE needs 200 to avoid flickers, others can get by with 100
        });

        function refreshList() {
            if(!angular.equals($scope.options, oldOptions)) {
                $scope.currentPage = 1;
            }
            util.save('options', $scope.options);
            getGames(true)
            .then(function() {
                angular.copy($scope.options, oldOptions);
            });
            $location.search('page', $scope.currentPage);
            timer = null;
        }

        $scope.$watchGroup(['options.text', 'options.orderBy', 'options.justMyGames', 'options.pageSize', 'currentPage' ], function(args) {
            var sc = $scope.options.text != oldOptions.text;
            if(!sc) {
                refreshList();
            }
            else {
                $timeout.cancel(timer);
                timer = $timeout(refreshList, 500);
            }
        });

        $scope.$emit('pane:loaded', 'games');

        function getGames(force) {
            var i, h, pc, q = Q.defer();
            gamelist.getlist(force, $scope.options.text, $scope.currentPage - 1, $scope.options.pageSize, orders[$scope.options.orderBy].sql, $scope.options.justMyGames)
            .then(function(gameList) {
                $scope.results = ($scope.options.text.length ? 'Found ' : '') + gameList.total + ' game' + (gameList.total !== 1 ? 's' : '');
                $scope.totalGames = gameList.total;
                $scope.games = gameList.games;
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

        $scope.star = function(index, g) {
            return index <= Math.floor(g.game_rating + 0.25) ? 'yellow' : 'white';  // slightly generous (allow a game to be a 5 which isn't 100% 5 rated)
        };

        $scope.$on('user:updated', function(msg, details) {
            $scope.user_id = user.id();
            if($scope.options.justMyGames) {
                getGames(true);
            }
        });

        $scope.$on('$destroy', function() {
            util.save('options', $scope.options);
        });

        $scope.refreshGameList = function() {
            return getGames(true);
        };

        $scope.rename = function(game_id, game_name) {
            dialog.getText("Rename " + game_name, '', 'New Name', 'New name', game_name)
            .then(function(text) {
                if(text !== game_name) {
                    // TODO (chs): move this into the gamelist service (and don't refresh gamelist)
                    ajax.post('rename', {
                        game_id: game_id,
                        name: text }, 'Renaming ' + game_name + ' to ' + text)
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
            if(mainApp.isMobile) {
                location.href = 'http://256pixels.net/play/' + id;
            }
            else {
                gamelist.get(id)
                .then(function(result) {
                    result.editing = false;
                    game.play(result, true);
                });
            }
        };

        $scope.editIt = function(event, id) {
            $location.path('/edit/' + id);
            event.preventDefault();
        };

    }]);

})();

