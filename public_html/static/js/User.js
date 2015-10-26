mainApp.factory('user', [ '$rootScope', '$uibModal', 'ajax', 'status', 'dialog',
function ($rootScope, $uibModal, ajax, status, dialog) {
    "use strict";

    var details = {
            user_id: 0,
            user_username: "",
            user_email: ""
        },

        expire = function (days) {
            var now = new Date();
            return {
                expires: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
            };
        },

        save_token = function(token) {
            localStorage.setItem('token', token);
        },

        delete_token = function() {
            localStorage.removeItem('token');
        },

        get_token = function() {
            return localStorage.getItem('token');
        },

        handleReason = function(reason, loginDetails) {
            var q = Q.defer();
            switch(reason) {
                case 'registration-required':
                    loginDetails.dialogTitle = 'Register';
                    loginDetails.editingProfile = false;
                    loginDetails.changePassword = true;
                    loginDetails.update = false;
                    $uibModal.open({
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
                ajax.post('public/login', details, 'Logging in ' + details.email + '...')
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
                    $uibModal.open({
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
                        save_token(result.token);
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

                $uibModal.open({
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
                var user_token = get_token(),
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
                    // get username from database 1st
                    ajax.get('userdetails', {
                        code: query.resetpassword,
                        email: query.email
                    })
                    .then(function(response) {
                        $uibModal.open({
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
                            save_token(result.token);
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
                else if(user_token) {
                    ajax.get('refreshSession')
                    .then(function(response) {
                        save_token(response.data.token);
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
                delete_token();
                details = {
                            user_id: 0,
                            user_username: "",
                            user_email: ""
                        };
                q.resolve();
                $rootScope.$broadcast('user:logout');
                return q.promise;
            },

            update: function(d, reason) {
                var exp = expire(365);
                details = d;
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'user',
                    eventAction: reason,
                    eventValue: details.user_id,
                    eventInteration: false
                });
                if(details.user_id !== 0) {
                    $rootScope.$broadcast('user:updated', details);
                }
            },

            id: function() {
                return details.user_id;
            },

            name: function() {
                return details.user_username || "Anonymous";
            },

            email: function() {
                return details.user_email;
            }
        };

    return user;

}]);

