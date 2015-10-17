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

    // TODO (chs): fix lame hard coded change tracking thing

    var saved;

    function clearChanges(game) {
        saved = {
            game_title: game.game_title,
            game_instructions: game.game_instructions,
            game_framerate: game.game_framerate
        };
    }

    mainApp.factory('game', ['ajax', 'user', '$rootScope', 'gamelist', 'status',
    function(ajax, user, $rootScope, gamelist, status) {
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

            changed: function () {
                return saved !== undefined &&
                        (game.game_title !== saved.game_title ||
                        game.game_instructions !== saved.game_instructions ||
                        game.game_framerate !== saved.game_framerate);
            },

            changes: function() {
                var c = [];
                if (saved !== undefined) {
                    if(game.game_title !== saved.game_title) {
                        c.push('Name');
                    }
                    if(game.game_instructions !== saved.game_instructions) {
                        c.push('Instructions');
                    }
                    if(game.game_framerate !== saved.game_framerate) {
                        c.push('Framerate');
                    }
                }
                return c;
            },

            // screenshots are saved instantly
            set_screenshot: function(s) {

                game.game_screenshot = hex(s);
                ajax.post('screenshot', {
                            screen: game.game_screenshot,
                            game_id: game.game_id
                        }, 'Saving screenshot')
                .then(function() {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'game',
                        eventAction: 'screenshot',
                        eventValue: game_id
                    });
                    gamelist.setscreenshot(game.game_id, s);
                });
            },

            reset: function() {
                merge({
                    game_id: 0,
                    game_title: 'New Game',
                    game_instructions: '',
                    game_framerate: 2,
                    game_source: '',
                    game_screenshot: [],
                    game_rating: 0,
                    rating_stars: 0,
                    user_id: 0,
                    user_username: 0
                }, game);
                game.play(game, true);
                $rootScope.$broadcast('refreshRating');
            },

            clearChanges: function() {
                clearChanges(game);
            },

            find: function(id, name) {
                var q = Q.defer();
                console.log(name);
                ajax.get('gameid', { name: name })
                .then(function(response) {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'game',
                        eventAction: 'delete',
                        eventLabel: name,
                        eventValue: id
                    });
                    q.resolve(response);
                }, function(response) {
                    q.reject(response);
                });
                return q.promise;
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
                var s;
                s = new mainApp.sandbox(g.game_source);
                if(s.errors.length > 0) {
                    // report 1st error
                    console.log("FOUND ERROR:", s.errors[0]);
                    status.error(s.errors[0].message);  // go to line/column
                    $rootScope.$broadcast('editorGoto', s.errors[0]);
                }
                else {
                    mergeInto(game, g);
                    game.wrapper = s;
                    game.editing = (g && g.editing) || false;
                    $rootScope.$broadcast('play', {
                        game: {
                            game_id: game.game_id,
                            game_framerate: game.game_framerate,
                            source: s.code
                        },
                        force: forceRestart
                    });
                }
            },

            create: function(newgame) {
                var q = Q.defer(),
                    g = {
                        game_title: newgame.game_title || '',
                        game_source: newgame.game_source || '',
                        game_instructions: newgame.game_instructions || '',
                        game_framerate: newgame.game_framerate
                    };
                ajax.post('create', g, 'Creating ' + game.game_title)
                .then(function(response) {
                    game.game_source = newgame.game_source;
                    game.game_id = response.data.game_id;
                    game.game_title = newgame.game_title;
                    game.game_instructions = newgame.game_instructions;
                    game.game_framerate = newgame.game_framerate;
                    game.user_id = user.id();   // owns it now...
                    game.user_username = user.name();
                    $rootScope.$broadcast('refreshRating');
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'game',
                        eventAction: 'create',
                        eventLabel: game.game_title,
                        eventValue: game.game_id
                    });
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
                    ajax.post('save', g, 'Saving ' + game.game_title)
                    .then(function(response) {
                        game.user_id = user.id();   // whoever saved it owns it now!
                        // TODO (chs): update the byline!?
                        game.user_username = user.name();
                        clearChanges(game);
                        ga('send', {
                            hitType: 'event',
                            eventCategory: 'game',
                            eventAction: 'save',
                            eventLabel: game.game_title,
                            eventValue: game.game_id
                        });
                        q.resolve(response.data);
                    }, function(response) {
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
                ajax.get('source', { game_id: id }, 'Loading game ' + id)
                .then(function(response) {
                    angular.extend(game, response.data);
                    clearChanges(game);
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
