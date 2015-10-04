mainApp.factory('user', [ '$rootScope', '$modal', 'ajax', 'cookie', 'status',
function ($rootScope, $modal, ajax, cookie, status) {
    "use strict";

    var details = {
            user_id: 0,
            user_username: "",
            user_email: "",
            user_session: 0
        },

        user = {

            isLoggedIn: function() {
                return details.user_id !== 0;
            },

            register: function(details) {
                return ajax.post('register', details, 'Registering ' + details.email);
            },

            dologin: function(details) {
                var q = Q.defer();
                ajax.post('login', details, 'Logging in ' + details.email + '...')
                .then(function(response) {
                    q.resolve(response.data);
                }, function(response) {
                    q.reject(response);
                });
                return q.promise;
            },

            login: function (message) {
                var loginDetails =  {
                    username: '',
                    email: '',
                    password: '',
                    password2: '',
                    failed: false,
                    msg: message || "Sign In"
                };

                var q = Q.defer();
                if(details.user_id === 0) {
                    $modal.open({
                        animation: true,
                        size: 'x-small',
                        templateUrl: '/static/html/loginModal.html',
                        controller: 'LoginModalInstanceController',
                        resolve: {
                            details: function () {
                                return loginDetails;
                            }
                        }
                    }).result.then(function (result) {
                        if(result.registration === 'required') {
                            $modal.open({
                                animation: true,
                                templateUrl: '/static/html/registerModal.html',
                                controller: 'RegisterModalInstanceController',
                                resolve: {
                                    details: function() {
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
                    ajax.get('refreshSession', data)
                    .then(function(response) {
                        data.user_session = response.data.user_session;
                        user.update(data);
                        status('Welcome back ' + data.user_username);
                        q.resolve();
                    },
                    function(response) {
                        user.update({user_id: 0});
                        status('Session expired, please log in again...');
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
                ajax.get('endSession', { user_id: details.user_id, user_session: details.user_session }, 'Logging ' + details.user_username + ' out...')
                .then(function() {
                    user.update({user_id: 0, user_session: 0});
                    $rootScope.$broadcast('user:logout');
                    q.resolve();
                }, function() {
                    user.update({user_id: 0, user_session: 0});
                    $rootScope.$broadcast('user:logout');
                    q.reject();
                });
                return q.promise;
            },

            update: function(d) {
                details = d;
                ajax.set_user(user);
                cookie.set('user_id', details.user_id, 30);
                cookie.set('user_username', details.user_username, 30);
                cookie.set('user_session', details.user_session, 30);
                cookie.set('user_email', details.user_email, 30);
                if(details.user_session !== 0) {
                    $rootScope.$broadcast('user:updated', details);
                }
            },

            id: function() {
                return details.user_id;
            },

            name: function() {
                return details.user_username || "Anonymous";
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

