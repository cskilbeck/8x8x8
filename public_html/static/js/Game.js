(function() {

    function hex(a) {
        var i, s = '';
        for(i in a) {
            s += (a[i] | 0x10).toString(16).substr(-1);
        }
        return s;
    }

    function copy(o) {
        var k, r = {};
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

    mainApp.factory('game', ['ajax', 'user', '$rootScope',
    function(ajax, user, $rootScope) {
        "use strict";

        var game = {

            game_id: 0,
            user_id: 0,
            user_session: 0,
            game_created: new Date(),
            game_lastsaved: new Date(),
            game_title: '',
            game_instructions: '',
            game_framerate: 0,
            game_source: '',
            game_screenshot: [],

            // screenshots are saved instantly
            set_screenshot: function(s) {

                game.game_screenshot = hex(s);
                ajax.post('/api/screenshot', {
                            user_id: user.id(),
                            user_session: user.session(),
                            screen: game.game_screenshot,
                            game_id: game.game_id
                        })
                .then(function() {
                    $rootScope.$broadcast('status', 'Saved screenshot');
                }, function(xhr) {
                    $rootScope.$broadcast('error', 'Error saving screenshot: ' + xhr.statusText);
                });
            },

            find: function(id, name) {
                return ajax.get('/api/gameid', { user_id: user.id(), game_title: name });
            },

            create: function(source) {
                var g, q = Q.defer();
                game.game_id = 0;
                game.user_id = user.id();
                game.user_session = user.session();
                game.game_created = new Date();
                game.game_lastsaved = new Date();
                game.game_source = source || '';
                game.game_screenshot = [];
                g = copy(game);
                console.log(g);
                ajax.post('/api/create', g)
                .then(function(result) {
                    game.game_id = result.game_id;
                    q.resolve(game);
                }, function(xhr) {
                    q.reject();
                });
                return q.promise;
            },

            play: function(g) {
                game.editing = (g && g.editing) || false;
                $rootScope.$broadcast('play', g);
            },

            save: function() {
                game.user_session = user.session();
                game.game_instructions = game.game_instructions || '';
                return ajax.post('/api/save', copy(game), 'Saving ' + game.game_title, 'Saved ' + game.game_title, 'Error saving ' + game.game_title);
            },

            load: function(id) {
                var q = Q.defer();
                ajax.get('/api/source', { game_id: id }, 'Loading game ' + id, 'Loaded game ' + id, 'Error loading game ' + id)
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
