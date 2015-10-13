(function() {
    "use strict";

    var orders = [
        'game_rating desc',
        'game_lastsaved desc',
        'game_created desc',
        'game_rating desc'      // TODO (chs) implement game_playcount
    ];

    var newSearchParams;

    mainApp.controller('PopoverCtrl', ['$scope', '$rootScope',
    function($scope, $rootScope) {
        $scope.searchParams = newSearchParams;
    }]);

    mainApp.controller('GameListController', ['$scope', '$routeParams', 'dialog', 'user', 'ajax', 'gamelist', '$rootScope', 'game', '$location', '$timeout', 'util', '$templateCache',
    function ($scope, $routeParams, dialog, user, ajax, gamelist, $rootScope, game, $location, $timeout, util, $templateCache) {

        var timer,
            pagesWindowSize = 5, // needs to be odd
            totalPages = 1,
            oldParams = {};

        // for the options popover
        $templateCache.put('search-popover-template.html', $('#mytemplate').html());

        $scope.$parent.pane = 'Games';
        $scope.games = [];
        $scope.user_id = user.id();
        $scope.viewStyle = mainApp.isMobile ? 'list' : (util.load('viewStyle') || 'box');
        $scope.pages = [];
        $scope.currentPage = 1;
        $scope.results = '';

        $scope.searchParams = angular.extend(util.load('searchParams'), {
            text: '',
            orderBy: 0,
            justMyGames: 0,
            pageSize: 10
        });

        console.log($scope.searchParams);

        newSearchParams = $scope.searchParams;

        $scope.view = function(v) {
            $scope.viewStyle = v;
            $('.cloakable').hide();     // hide gamelist while $digests are in progress
            $timeout(function() {
                $('.cloakable').show(); // to avoid ugly style flickering
            }, 100);
        };

        $scope.$watchGroup(['searchParams.text', 'searchParams.orderBy', 'searchParams.justMyGames', 'searchParams.pageSize', 'currentPage'], function() {
            console.log($scope.searchParams);
            var sc = $scope.searchParams.text != oldParams.text;
            if(timer) {
                $timeout.cancel(timer);
            }
            timer = $timeout(function() {
                if(!angular.equals($scope.searchParams, oldParams)) {
                    util.save('searchParams', $scope.searchParams);
                    $scope.currentPage = 1;
                }
                getGames(true)
                .then(function() {
                    angular.copy($scope.searchParams, oldParams);
                });
                timer = null;
            }, sc ? 500 : 0);
        });

        $scope.pageDisabled = function(p) {
            return ((p.offset < 0 && $scope.currentPage === 1) ||
                    (p.offset > 0 && $scope.currentPage === totalPages));
        };

        $scope.choosePage = function(p) {
            var np;
            if(!$scope.pageDisabled(p)) {
                if(p.offset) {
                    np = $scope.currentPage + p.offset;
                    $scope.currentPage = Math.max(1, Math.min(totalPages, np));
                }
                else if(p.value) {
                    $scope.currentPage = p.value;
                }
            }
        };

        $scope.newGame = function() {
            $location.path('/edit/new');
        };

        $scope.$emit('pane:loaded', 'games');

        function getGames(force) {
            var i, l, h, pc, q = Q.defer();
            gamelist.getlist(force, $scope.searchParams.text, $scope.currentPage - 1, $scope.searchParams.pageSize, orders[$scope.searchParams.orderBy], $scope.searchParams.justMyGames)
            .then(function(gameList) {
                $scope.results = ($scope.searchParams.text.length ? 'Found ' : '') + gameList.total + ' game' + (gameList.total !== 1 ? 's' : '');

                // total page count, we'll show N at most
                totalPages = (gameList.total + $scope.searchParams.pageSize - 1) / $scope.searchParams.pageSize | 0;
                $scope.pages = [];
                if(totalPages > 1) {
                    if(totalPages > pagesWindowSize) {
                        $scope.pages.push({ class:'fa fa-fast-backward', text:'', offset: -totalPages });
                        $scope.pages.push({ class:'fa fa-backward', text:'', offset: -pagesWindowSize });
                    }
                    l = Math.max(1, $scope.currentPage - (pagesWindowSize / 2 | 0)) ;
                    h = Math.min(l + pagesWindowSize - 1, totalPages);
                    l = Math.max(1, h - pagesWindowSize + 1);
                    for(i = l; i <= h; ++i) {
                        $scope.pages.push({class:'', text:i, value: i});
                    }
                    if(totalPages > pagesWindowSize) {
                        $scope.pages.push({ class:'fa fa-forward', text:'', offset: pagesWindowSize});
                        $scope.pages.push({ class:'fa fa-fast-forward', text:'', offset: totalPages });
                    }
                }
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
//          getGames(true);
        });

        $scope.$on('$destroy', function() {
            util.save('viewStyle', $scope.viewStyle);
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
            $scope.searchParams.justMyGames = x;
        };

        $scope.topGames = function() {
            $scope.searchParams.orderBy = 0;
        };

        $scope.recentlyModified = function() {
            $scope.searchParams.orderBy = 1;
        };

        $scope.newGames = function() {
            $scope.searchParams.orderBy = 2;
        };

        $scope.mostPlayed = function() {
            $scope.searchParams.orderBy = 3;
        };

        $scope.toShow = function(x) {
            return ['All Games', 'My Games'][x];
        };

        $scope.setJMG = function(x) {
            $scope.searchParams.justMyGames = x;
            console.log(x);
        };

        $scope.showSearchOptions = function() {
        };

        $('#searchOptions').popover({
            content: function() { return $("#searchOptionsTemplate").html(); },
        });

        $("[data-toggle = popover]").popover();
        /* <div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div> */

        getGames(true);

    }]);

})();

