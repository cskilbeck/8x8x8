
// DONE (chs): save/restore state of which rows in gamelist were expanded [kinda, it just started working... wierd...]

(function() {
    "use strict";

    mainApp.controller('GameListController', ['$scope', '$routeParams', 'dialog', 'user', 'ajax', 'gamelist', '$rootScope', 'game', '$location', '$timeout',
    function ($scope, $routeParams, dialog, user, ajax, gamelist, $rootScope, game, $location, $timeout) {

        var timer,
            searched,
            pagesWindowSize = 5, // needs to be odd
            totalPages = 1,
            pageSize = 10;

        $scope.$parent.pane = 'Games';
        $scope.games = [];
        $scope.user_id = user.id();
        $scope.viewStyle = mainApp.isMobile ? 'list' : (localStorage.getItem('viewStyle') || 'box');
        $scope.search = '';
        $scope.pages = [];
        $scope.currentPage = 1;
        $scope.results = '';

        // each page has class and content
        // class can be '' if content not '' and vice versa

        $scope.view = function(v) {
            $scope.viewStyle = v;
            $('.cloakable').hide();     // hide gamelist while $digests are in progress
            $timeout(function() {
                $('.cloakable').show(); // to avoid ugly style flickering
            }, 100);
        };

        $scope.$watchGroup(['search', 'currentPage'], function() {
            var sc = $scope.search !== searched;
            if(timer) {
                $timeout.cancel(timer);
            }
            timer = $timeout(function() {
                if(sc) {
                    $scope.currentPage = 1;
                }
                getGames(true)
                .then(function() {
                    searched = $scope.search;
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

        $('#refreshButton').tooltip();

        function getGames(force) {
            var i, l, h, pc, q = Q.defer();
            gamelist.getlist(force, $scope.search, $scope.currentPage - 1, pageSize)
            .then(function(gameList) {
                $scope.results = ($scope.search.length ? 'Found ' : '') + gameList.total + ' game' + (gameList.total !== 1 ? 's' : '');

                // total page count, we'll show N at most
                totalPages = (gameList.total + pageSize - 1) / pageSize | 0;
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
            localStorage.setItem('viewStyle', $scope.viewStyle);
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

        getGames(true);

    }]);

})();

