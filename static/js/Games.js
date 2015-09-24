mainApp.factory('games', ['ajax', 'user',
function(ajax, user) {
    "use strict";

    // { game_id: number, user_id: number, game_title: string, game_lastsaved: datetime, game_created: datetime, user_username:string }

    var list = [],
        refreshing = false;

    function findByIndex(id) {
        var i;
        for(i = 0; i < list.length; ++i) {
            if(list[i].game_id === id) {
                return { index: i, game: list[i] };
            }
        }
        return null;
    }

    function findByTitle(title) {
        var i;
        for(i = 0; i < list.length; ++i) {
            if(list[i].game_title === title) {
                return { index: i, game: list[i] };
            }
        }
        return null;
    }

    var games = {

        // get the list of games
        get: function(force) {
            var q = Q.defer();
            if(list.length === 0 || force) {
                ajax.get('/api/list', { user_id: -1 } )
                .then(function(result) {
                    list = result.games;
                    q.resolve(list);
                }, function(xhr) {
                    q.reject(xhr);
                });
            } else {
                q.resolve(list);
            }
            return q.promise;
        },

        // re-get the list of games next time someone asks for it
        reset: function() {
            list = [];
        },

        // delete a game
        delete: function(game_id) {
            var g,
                q = Q.defer();
            ajax.post('/api/delete', { user_id: user.id(), user_session: user.session(), game_id: game_id })
            .then(function(result) {
                g = findByIndex(game_id);
                if(g !== null) {
                    list.splice(g.index, 1);
                }
                q.resolve();
            }, function(xhr) {
                q.reject();
            });
            return q.promise;
        },

        // TODO (chs): make these update the database!

        rename: function(game_id, name) {
            var g = findByIndex(game_id),
                q = Q.defer();
            if(g !== null) {
                g.game.name = name;
                q.resolve();
            }
            else {
                q.reject();
            }
            return q.promise;
        },

        setSource: function(game_id, source) {
            var g = findByIndex(game_id),
                q = Q.defer();
            if(g !== null) {
                g.game.game_source = source;
                q.resolve();
            }
            else {
                q.reject();
            }
            return q.promise;
        }

    };

    return games;

}]);

