(function() {

    function hex(a) {
        var i, s = '';
        for(i in a) {
            s += (a[i] | 0x10).toString(16).substr(-1);
        }
        return s;
    }

    function mergeInto(n, o) {
        var k;
        for(k in o) {
            if(Object.prototype.hasOwnProperty.call(o,k)) {
                n[k] = o[k];
            }
        }
        return n;
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

            getRating: function() {
                var q = Q.defer();
                ajax.get('rating', { game_id: game.game_id })
                .then(function(response) {
                    game.hover_rating = game.rating_stars = response.data.rating_stars;
                    q.resolve(response);
                }, function(response) {
                    q.reject(response);
                });
                return q.promise;
            },

            play: function(g, forceRestart) {
                mergeInto(game, g);
                game.editing = (g && g.editing) || false;
                $rootScope.$broadcast('play', {
                    game: g, 
                    force: forceRestart
                });
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
                .then(function(response) {
                    game.game_source = newgame.game_source;
                    game.game_id = response.data.game_id;
                    game.game_title = newgame.game_title;
                    game.game_instructions = newgame.game_instructions;
                    game.game_framerate = newgame.game_framerate;
                    game.user_id = user.id();   // owns it now...
                    game.user_username = user.name();
                    $rootScope.$broadcast('game:changed', game);
                    console.log("Created", game.game_title, ":", game.game_instructions);
                    q.resolve(game);
                }, function(response) {
                    q.reject(response);
                });
                return q.promise;
            },

            save: function() {
                var q = Q.defer(),
                    g = copy(game);
                g.game_instructions = g.game_instructions || '';
                g.game_title = g.game_title || '';
                g.game_source = g.game_source || '';
                if(g.user_id === user.id()) {
                    ajax.post('save', g, 'Saving ' + game.game_title, 'Saved ' + game.game_title, 'Error saving ' + game.game_title)
                    .then(function(response) {
                        game.user_id = user.id();   // whoever saved it owns it now!
                        // TODO (chs): update the byline!?
                        game.user_username = user.name();
                        console.log("Saved", g.game_title, ":", g.game_instructions);
                        q.resolve(response.data);
                    }, function(response) {
                        console.log("Error saving", g.game_title, ":", g.game_instructions);
                        q.reject(response);
                    });
                }
                else {
                    return game.create(g);
                }
                return q.promise;
            },

            load: function(id) {
                var q = Q.defer();
                ajax.get('source', { game_id: id }, 'Loading game ' + id, 'Loaded game ' + id, 'Error loading game ' + id)
                .then(function(response) {
                    angular.extend(game, response.data);
                    q.resolve(response.data);
                }, function(response) {
                    q.reject(response);
                });
                return q.promise;
            },
        };

        return game;

    }]);

})();
