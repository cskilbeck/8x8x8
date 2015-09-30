mainApp.factory('gamelist', ['ajax', 'user',
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
        // TODO (chs): search term and paging parameters (and respect the cache is they're unchanged - eg coming back to the pane)
        getlist: function(force) {
            var i, q = Q.defer();
            if(list.length === 0 || force) {
                ajax.get('list', { user_id: user.id(), justmygames: 0 } )
                .then(function(result) {

                    list = result.games || [];
                    for(i in list) {
                        list[i].hover_rating = list[i].rating_stars || 0;
                    }
                    q.resolve(list);
                }, function(xhr) {
                    q.reject(xhr);
                });
            } else {
                q.resolve(list);
            }
            return q.promise;
        },

        refreshOne: function(id) {
            var g = findByIndex(id),
                q = Q.defer();
            if(g)
            {
                ajax.get('list', { justmygames: 0, game_id: id, user_id: 0 })
                .then(function(result) {
                    if(result.count == 1) {
                        list[g.index] = result.games[0];
                        q.resolve(result[0]);
                    }
                    else {
                        q.reject();
                    }
                }, function(xhr) {
                    q.reject();
                });
            }
            else {
                q.reject();
            }
            return q.promise;
        },

        rate: function(game, rating) {
            return ajax.post('rate', {
                game_id: game.game_id,
                rating: rating
            });
        },

        getcount: function(search) {
            search.text = search.text || '*';
            search.user_id = search.user_id || -1;
            return ajax.get('count', search);
        },

        get: function(id) {
            var g, q = Q.defer();
            ajax.get('source', { game_id: id })
            .then(function(result) {
                g = findByIndex(id);
                if(g) {
                    result.hover_rating = result.rating_stars = g.game.rating_stars;
                }
                q.resolve(result);
            }, function(xhr) {
                q.reject(xhr);
            });
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
            ajax.post('delete', { game_id: game_id })
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

