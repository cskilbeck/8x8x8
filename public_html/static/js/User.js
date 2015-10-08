mainApp.factory('user', [ '$rootScope', '$modal', 'ajax', 'cookie', 'status', 'dialog',
function ($rootScope, $modal, ajax, cookie, status, dialog) {
    "use strict";

    var details = {
            user_id: 0,
            user_username: "",
            user_email: "",
            user_session: 0
        },

        handleReason = function(reason, loginDetails) {
            var q = Q.defer();
            switch(reason) {
                case 'registration-required':
                    loginDetails.dialogTitle = 'Register';
                    loginDetails.editingProfile = false;
                    loginDetails.update = false;
                    $modal.open({
                        animation: true,
                        size: 'x-small',
                        templateUrl: '/static/html/registerModal.html',
                        controller: 'RegisterModalInstanceController',
                        resolve: {
                            details: function() {
                                return loginDetails;
                            }
                        }
                    }).result.then(function(result) {
                        user.update(result, 'register');
                        q.resolve(result);
                    }, function(reason) {
                        q.reject();
                    });
                    break;
                case 'resetpassword-complete':
                    dialog.small.inform("Password reset", "We've sent an email to " + loginDetails.email + " with instructions for resetting your password.\n\nThanks!")
                    .then(function() {
                        q.reject();
                    });
                    break;
                case 'resetpassword-failed':
                    dialog.small.inform("Password reset failed", "Sorry, we don't seem to have a record of " + loginDetails.email + " in our system, are you sure you have the right address?")
                    .then(function() {
                        q.reject();
                    });
                    break;
                default:
                    q.reject();
                }
                return q.promise;
            },

        user = {

            isLoggedIn: function() {
                return details.user_id !== 0;
            },

            register: function(details) {
                if(details.update) {
                    return ajax.post('details', details, 'Updating details for ' + details.email);
                }
                else {
                    return ajax.post('register', details, 'Registering ' + details.email);
                }
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
                    }).result
                    .then(function (result) {
                        user.update(result, 'login');
                        q.resolve(result);
                    }, function(reason) {
                        handleReason(reason, loginDetails)
                        .then(function() {
                            q.reject();
                        });
                    });
                } else {
                    q.resolve(details);
                }
                return q.promise;
            },

            editProfile: function() {
                var q = Q.defer(),
                    details = {
                                username: user.name(),
                                user_id: user.id(),
                                email: user.email(),
                                editingProfile: true,
                                update: true,
                                changePassword: false,
                                newPasswordTitle: "New ",
                                oldpassword: '',
                                password: '',
                                password2: '',
                                failed: false,
                                msg: "Edit profile",
                                dialogTitle: "Edit profile"
                            };

                $modal.open({
                    animation: true,
                    size: 'x-small',
                    templateUrl: '/static/html/registerModal.html',
                    controller: 'RegisterModalInstanceController',
                    resolve: {
                        details: function() {
                            return details;
                        }
                    }
                }).result.then(function(result) {
                    user.update(result, 'profile');
                    q.resolve(result);
                }, function(reason) {
                    handleReason(reason, details)
                    .then(function() {
                        q.reject();
                    });
                });
                return q.promise;
            },

            refreshSession: function(query) {
                var user_session = cookie.get('user_session') || '0',
                    user_id = cookie.get('user_id') || '0',
                    data = {
                        user_session: parseInt(user_session),
                        user_id: parseInt(user_id),
                        user_username: cookie.get('user_username'),
                        user_email: cookie.get('user_email')
                    },
                    q = Q.defer();

                if(Object.prototype.hasOwnProperty.call(query, 'resetpassword') &&
                    Object.prototype.hasOwnProperty.call(query, 'email')) {
                    // they want to reset their password - pop up the register dialog so they can change their profile
                    var details =  {
                        username: '',
                        user_id: 0,
                        email: query.email,
                        code: query.resetpassword,
                        changePassword: true,
                        password: '',
                        password2: '',
                        failed: false,
                        msg: "Edit details",
                        dialogTitle: 'Edit your details'
                    };
                    // get username from database 1st (could log them in here...)
                    ajax.get('userdetails', {
                        code: query.resetpassword,
                        email: query.email
                    })
                    .then(function(response) {
                        $modal.open({
                            animation: true,
                            size: 'x-small',
                            templateUrl: '/static/html/registerModal.html',
                            controller: 'RegisterModalInstanceController',
                            resolve: {
                                details: function() {
                                    details.update = true;
                                    details.editingProfile = false;
                                    details.username = response.data.user_username;
                                    details.user_id = response.data.user_id;
                                    return details;
                                }
                            }
                        }).result.then(function(result) {
                            user.update(result, 'register');
                            q.resolve(result);
                        }, function(reason) {
                            // couldn't get user details
                            q.reject();
                        });
                    }, function(response) {
                        dialog.small.inform("Invalid reset code", "Sorry, no dice - reset code has expired or is invalid or email address is invalid");
                        q.reject();
                    });
                }

                // if cookie session is set but different from current one (either because)

                else if(!isNaN(data.user_session) && data.user_session !== user.session()) {
                    ajax.get('refreshSession', data)
                    .then(function(response) {
                        data.user_session = response.data.user_session;
                        user.update(response.data, 'refreshSession');
                        status('Welcome back ' + data.user_username);
                        q.resolve();
                    },
                    function(response) {
                        user.update({user_id: 0}, 'sessionExpired');
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
                    user.update({user_id: 0, user_session: 0}, 'logout');
                    $rootScope.$broadcast('user:logout');
                    q.resolve();
                }, function() {
                    user.update({user_id: 0, user_session: 0}, 'logoutFailed');
                    $rootScope.$broadcast('user:logout');
                    q.reject();
                });
                return q.promise;
            },

            update: function(d, reason) {
                details = d;
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'user',
                    eventAction: reason,
                    eventValue: details.user_id,
                    eventInteration: false
                });
                ajax.set_user(user);
                console.log(d);
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

