(function() {

    function hex(a) {
        var i, s = '';
        for(i in a) {
            s += (a[i] | 0x10).toString(16).substr(-1);
        }
        return s;
    }

    function merge(o, r) {
        var k;
        for(k in o) {
            if(Object.prototype.hasOwnProperty.call(o,k)) {
                switch(typeof o[k]) {
                    case 'function':
                    case 'object':
                    case 'array':
                        break;
                    default:
                        r[k] = o[k];
                        break;
                }
            }
        }
        return r;
    }

    function copy(o) {
        return merge(o, {});
    }

    mainApp.factory('game', ['ajax', 'user', '$rootScope', 'gamelist',
    function(ajax, user, $rootScope, gamelist) {
        "use strict";

        var game = {

            game_id: 0,
            game_title: '',
            game_instructions: ' ',
            game_framerate: 0,
            game_source: '',
            game_screenshot: [],
            game_rating: 0,
            rating_stars: 0,

            // screenshots are saved instantly
            set_screenshot: function(s) {

                game.game_screenshot = hex(s);
                ajax.post('screenshot', {
                            screen: game.game_screenshot,
                            game_id: game.game_id
                        })
                .then(function() {
                    $rootScope.$broadcast('status', 'Saved screenshot');
                    gamelist.refreshOne(game.game_id);
                }, function(xhr) {
                    $rootScope.$broadcast('error', 'Error saving screenshot: ' + xhr.statusText);
                });
            },

            reset: function() {
                merge({
                    game_id: 0,
                    game_title: '',
                    game_instructions: ' ',
                    game_framerate: 0,
                    game_source: '',
                    game_screenshot: [],
                    game_rating: 0,
                    rating_stars: 0,
                    user_id: 0,
                    user_username: 0
                }, game);
                $rootScope.$broadcast('game:changed', game);
            },

            find: function(id, name) {
                return ajax.get('gameid', { game_title: name });
            },

            create: function(newgame) {
                var q = Q.defer(),
                    g = {
                        game_title: newgame.game_title || '',
                        game_source: newgame.game_source || '',
                        game_instructions: newgame.game_instructions || '',
                        game_framerate: newgame.game_framerate
                    };
                ajax.post('create', g, 'Creating ' + game.game_title, 'Created ' + game.game_title, 'Error creating ' + game.game_title)
                .then(function(result) {
                    game.game_source = newgame.game_source;
                    game.game_id = result.game_id;
                    game.game_title = newgame.game_title;
                    game.game_instructions = newgame.game_instructions;
                    game.game_framerate = newgame.game_framerate;
                    game.user_id = user.id();   // owns it now...
                    game.user_username = user.name();
                    $rootScope.$broadcast('game:changed', game);
                    q.resolve(game);
                }, function(xhr) {
                    q.reject(xhr);
                });
                return q.promise;
            },

            getRating: function() {
                var q = Q.defer();
                ajax.get('rating', { game_id: game.game_id })
                .then(function(result) {
                    game.hover_rating = game.rating_stars = result.rating_stars;
                    q.resolve(result);
                }, function(xhr) {
                    q.reject(xhr);
                });
                return q.promise;
            },

            play: function(g, forceRestart) {
                game.editing = (g && g.editing) || false;
                $rootScope.$broadcast('play', {
                    game: g, 
                    force: forceRestart
                });
            },

            save: function() {
                var g = copy(game);
                g.game_instructions = g.game_instructions || '';
                g.game_title = g.game_title || '';
                g.game_source = g.game_source || '';
                if(g.user_id === user.id()) {
                    ajax.post('save', g, 'Saving ' + game.game_title, 'Saved ' + game.game_title, 'Error saving ' + game.game_title)
                    .then(function(result) {
                        game.user_id = user.id();   // whoever saved it owns it now!
                        // TODO (chs): update the byline!?
                        game.user_username = user.user_username();
                    });
                }
                else {
                    game.create(g);
                }
            },

            load: function(id) {
                var q = Q.defer();
                ajax.get('source', { game_id: id }, 'Loading game ' + id, 'Loaded game ' + id, 'Error loading game ' + id)
                .then(function(result) {
                    angular.extend(game, result);
                    q.resolve(game);
                }, function(xhr) {
                    q.reject(xhr);
                });
                return q.promise;
            },
        };

        return game;

    }]);

})();
