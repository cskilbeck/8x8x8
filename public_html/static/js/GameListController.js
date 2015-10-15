(function() {
    "use strict";

    var orders = [
            'game_rating desc',
            'game_lastsaved desc',
            'game_created desc',
            'game_rating desc'      // TODO (chs) implement game_playcount
        ],
        oldParams = {};

    mainApp.controller('GameListController', ['$scope', '$routeParams', 'dialog', 'user', 'ajax', 'gamelist', '$rootScope', 'game', '$location', '$timeout', 'util', '$templateCache',
    function ($scope, $routeParams, dialog, user, ajax, gamelist, $rootScope, game, $location, $timeout, util, $templateCache) {

        var timer,
            pagesWindowSize = 3,
            cp = $location.search(),
            pageBase = 1,
            totalPages = 1;

        $scope.$parent.pane = 'Games';
        $scope.games = [];
        $scope.user_id = user.id();
        $scope.pages = [];
        $scope.currentPage = parseInt(cp.page, 10) || 1;
        $scope.results = '';

        var t = util.load('options') || {};
        $scope.options = angular.extend({
            text: '',
            orderBy: 0,
            justMyGames: 0,
            pageSize: 10,
            expanded: 0,
            viewStyle:mainApp.isMobile ? 'list' : 'box'
        }, t);

        $scope.$watch('options.viewStyle', function(n, o) {
            $('.cloakable').hide();     // hide gamelist while $digests are in progress
            $timeout(function() {
                $('.cloakable').show(); // to avoid ugly flexbox layout flickering
            }, 200);                    // EDGE needs 200 to avoid flickers, others can get by with 100
        });

        function refreshList() {
            if(!angular.equals($scope.options, oldParams)) {
                console.log("Options changed, resetting page to 1");
                $scope.currentPage = 1;
            }
            util.save('options', $scope.options);
            getGames(true)
            .then(function() {
                angular.copy($scope.options, oldParams);
            });
            $location.search('page', $scope.currentPage);
            timer = null;
        }

        $scope.$watchGroup(['options.text', 'options.orderBy', 'options.justMyGames', 'options.pageSize', 'currentPage'], function(args) {
            var sc = $scope.options.text != oldParams.text;
            if(!sc) {
                refreshList();
            }
            else {
                $timeout.cancel(timer);
                timer = $timeout(refreshList, 500);
            }
        });

        $scope.pageDisabled = function(p) {
            return (($scope.currentPage === 1 &&  p.offset < 1) || ($scope.currentPage === totalPages && p.offset > 0));
        };

        $scope.choosePage = function(p) {
            var newPageBase, newPage, topPage = totalPages - (pagesWindowSize - 1);
            if(!$scope.pageDisabled(p)) {
                if(p.offset) {
                    $scope.currentPage = Math.max(1, Math.min(totalPages, $scope.currentPage + p.offset));
                    pageBase = Math.max($scope.currentPage - pagesWindowSize + 1, Math.min($scope.currentPage, pageBase));
                }
                else if(p.value) {
                    $scope.currentPage = p.value;
                }
            }
        };

        $scope.$emit('pane:loaded', 'games');

        function getGames(force) {
            var i, h, pc, q = Q.defer();
            gamelist.getlist(force, $scope.options.text, $scope.currentPage - 1, $scope.options.pageSize, orders[$scope.options.orderBy], $scope.options.justMyGames)
            .then(function(gameList) {
                $scope.results = ($scope.options.text.length ? 'Found ' : '') + gameList.total + ' game' + (gameList.total !== 1 ? 's' : '');
                totalPages = (gameList.total + $scope.options.pageSize - 1) / $scope.options.pageSize | 0;
                $scope.pages = [];
                if(totalPages > 1) {
                    if(totalPages > pagesWindowSize) {
                        $scope.pages.push({ class:'fa fa-fast-backward', text:'', offset: -totalPages + 1 });
                        $scope.pages.push({ class:'fa fa-forward reversed', text:'', offset: -pagesWindowSize });
                        $scope.pages.push({ class:'fa fa-play reversed', text:'', offset: -1 });
                    }
                    h = Math.min(pageBase + pagesWindowSize - 1, totalPages);
                    for(i = pageBase; i <= h; ++i) {
                        $scope.pages.push({class:'', text:i, value: i});
                    }
                    if(totalPages > pagesWindowSize) {
                        $scope.pages.push({ class:'fa fa-play', text:'', offset: 1 });
                        $scope.pages.push({ class:'fa fa-forward', text:'', offset: pagesWindowSize });
                        $scope.pages.push({ class:'fa fa-fast-forward', text:'', offset: totalPages - 1 });
                    }
                }
                $scope.currentPage = Math.max(1, Math.min(totalPages, $scope.currentPage));
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
            $location.search('page', null);
            $location.path('/edit/' + id);
            event.preventDefault();
        };

        $scope.clicked = function(index) {
            $('#game_' + index).removeClass('dropshadow');
        };

        $scope.unclicked = function(index) {
            $('#game_' + index).addClass('dropshadow');
        };

        $scope.showGames = function(x) {
            $scope.options.justMyGames = x;
        };

        $scope.topGames = function() {
            $scope.options.orderBy = 0;
        };

        $scope.recentlyModified = function() {
            $scope.options.orderBy = 1;
        };

        $scope.newGames = function() {
            $scope.options.orderBy = 2;
        };

        $scope.mostPlayed = function() {
            $scope.options.orderBy = 3;
        };

        $scope.toShow = function(x) {
            return ['All Games', 'My Games'][x];
        };

        $scope.setJMG = function(x) {
            $scope.options.justMyGames = x;
            console.log(x);
        };

        $scope.showSearchOptions = function() {
        };

        $('#searchOptions').popover({
            content: function() { return $("#searchOptionsTemplate").html(); },
        });

        $("[data-toggle = popover]").popover();
        /* <div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div> */

//        getGames(true);

    }]);

})();

