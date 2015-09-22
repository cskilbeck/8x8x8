mainApp.factory('user', [ '$rootScope', '$modal', 'ajax', 'cookie',
function ($rootScope, $modal, ajax, cookie) {
    "use strict";

    var details = {
            user_id: 0,
            user_username: "",
            user_email: "",
            user_session: 0
        },
        user;

    user = {

        isLoggedIn: function() {
            return details.user_id !== 0;
        },

        login: function () {
            var loginDetails =  {
                username: '',
                email: '',
                password: '',
                password2: '',
                failed: false
            };

            var q = Q.defer();
            if(details.user_id === 0) {
                $modal.open({
                    animation: true,
                    templateUrl: 'loginModal.html',
                    controller: 'LoginModalInstanceController',
                    resolve: {
                        user: function () {
                            return loginDetails;
                        }
                    }
                }).result.then(function (result) {
                    if(result.registration === 'required') {
                        $modal.open({
                            animation: true,
                            templateUrl: 'registerModal.html',
                            controller: 'RegisterModalInstanceController',
                            resolve: {
                                user: function() {
                                    return loginDetails;
                                }
                            }
                        }).result.then(function(result) {
                            user.update(result);
                            q.resolve(result);
                        }, function(xhr) {
                            q.reject(xhr);
                        });
                    }
                    else {
                        user.update(result);
                        q.resolve(result);
                    }
                }, function(xhr) {
                    q.reject(xhr);
                });
            } else {
                q.resolve(details);
            }
            return q.promise;
        },

        refreshSession: function() {
            var user_session = cookie.get('user_session') || '0',
                user_id = cookie.get('user_id') || '0',
                data = {
                    user_session: parseInt(user_session),
                    user_id: parseInt(user_id),
                    user_username: cookie.get('user_username'),
                    user_email: cookie.get('user_email')
                },
                q = Q.defer();

            // if cookie session is set but different from current one (either because)

            if(!isNaN(data.user_session) && data.user_session !== user.session()) {
                ajax.get('/api/refreshSession', data)
                .then(function(result) {
                    result.user_email = data.user_email; // TODO (chs): get user details back from refreshSession
                    user.update(result);
                    $rootScope.$broadcast('status', 'Welcome back ' + data.user_username);
                    q.resolve();
                },
                function(xhr) {
                    user.update({user_id: 0});
                    $rootScope.$broadcast('status', 'Session expired, please log in again...');
                    q.resolve();
                });
            }
            else {
                q.resolve();
            }
            return q.promise;
        },

        logout: function() {
            var q = Q.defer();
            ajax.get('/api/endSession', { user_id: details.user_id, user_session: details.user_session }, 'Logging ' + details.user_username + ' out...')
            .then(function() {
                user.update({user_id: 0});
                q.resolve();
            }, function() {
                user.update({user_id: 0});
                q.reject();
            });
            return q.promise;
        },

        update: function(d) {
            details = d;
            cookie.set('user_id', details.user_id, 30);
            cookie.set('user_username', details.user_username, 30);
            cookie.set('user_session', details.user_session, 30);
            cookie.set('user_email', details.user_email, 30);
            $rootScope.$broadcast('user:updated', details);
        },

        id: function() {
            return details.user_id;
        },

        name: function() {
            return details.user_username;
        },

        session: function() {
            return details.user_session;
        },

        email: function() {
            return details.user_email;
        }
    };

    return user;

}]);

