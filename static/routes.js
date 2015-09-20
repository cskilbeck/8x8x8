// - split the javascript up (make mainApp a global)
// - get rid of all the local variables outside controllers
// - make a utility class for all the local functions
// - save editor options in user record

(function() {
    "use strict";

    var editor,
        session,
        name,
        game_id,
        source,
        mainApp,
        games = [],
        editorOptions = {
            theme: 'Monokai'
        };

    function format(str, col) {
        col = typeof col === 'object' ? col : Array.prototype.slice.call(arguments, 1);
        return str.replace(/\{\{|\}\}|\{(\w+)\}/g, function (m, n) {
            if (m == '{{') { return '{'; }
            if (m == '}}') { return '}'; }
            return col[n];
        });
    }

    function setCookie(name, value, days) {
        var expires;
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toGMTString();
        } else {
            expires = '';
        }
        document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + expires + '; path=/';
    }

    // returns cookie value if it exists or defaultValue (or null if no defaultValue supplied)
    function getCookie(name, defaultValue) {
        var nameEQ = encodeURIComponent(name) + '=',
            ca = document.cookie.split(';'),
            i, c ;
        for (i = 0; i < ca.length; i++) {
            c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
        return defaultValue || null;
    }

    function clearCookie(name) {
        setCookie(name, '', -1);
    }

    mainApp = angular.module("mainApp", ['ngRoute', 'ngAnimate', 'ui.bootstrap']);

    // a global service for user login details
    // user_id, user_username, user_email, user_session etc

    mainApp.factory('ajax', ['$rootScope',
    function($rootScope){

        function setInProgress(p) {
            $rootScope.$broadcast('network', p);
        }

        function reportStatus(msg) {
            $rootScope.$broadcast('status', msg);
        }

        function reportError(msg) {
            $rootScope.$broadcast('error', msg);
        }

        function doAjax(func, url, data, progress, complete, fail) {
            var q = Q.defer();
            setInProgress(true);
            reportStatus(progress);
            func(url, data)
            .done(function(result) {
                setInProgress(false);
                reportStatus(complete);
                $rootScope.$apply();
                q.resolve(result);
            })
            .fail(function(xhr) {
                setInProgress(false);
                reportError(fail || xhr.statusText);
                $rootScope.$apply();
                q.reject(xhr);
            });
            return q.promise;
        }

        var ajax = {

            get: function(url, data, progress, complete, fail) {
                return doAjax($.get, url, data, progress, complete, fail);
            },

            post: function(url, data, progress, complete, fail) {
                return doAjax($.post, url, data, progress, complete, fail);
            }
        };

        return ajax;

    }]);

    mainApp.factory('dialog', ['$rootScope', '$modal',
    function($rootScope, $modal) {

        function dialog(banner, text, oktext, canceltext, okclass, cancelclass) {
            var options = {
                    banner: banner,
                    text: text,
                    oktext: oktext,
                    canceltext: canceltext,
                    okclass: okclass || 'btn-primary',
                    cancelclass: cancelclass || 'btn-warning'
                },
                q = Q.defer();
            $modal.open({
                animation: true,
                templateUrl: 'dialogModal.html',
                controller: 'DialogModalInstanceController',
                resolve: {
                    options: function () {
                        return options;
                    }
                }
            }).result.then(function() {
                q.resolve(true);
            }, function() {
                q.resolve(false);
            });
            return q.promise;
        }
        return dialog;
    }]);

    mainApp.factory('user', [ '$rootScope', '$modal', 'ajax',
    function ($rootScope, $modal, ajax) {

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
                    var data = {
                            user_session: parseInt(getCookie('user_session')),
                            user_id: parseInt(getCookie('user_userid')),
                            user_username: getCookie('user_username'),
                            user_email: getCookie('user_email')
                        },
                        q = Q.defer();

                    // if cookie session is set but different from current one (either because)

                    console.log(data.user_session + ", " + user.session());

                    if(data.user_session !== null && data.user_session !== user.session()) {
                        console.log("Session refresh required");
                        ajax.get('/api/refreshSession', data)
                        .then(function(result) {
                            result.user_email = data.user_email; // TODO (chs): get user details back from refreshSession
                            console.log(result);
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
                        console.log("Session in progress");
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
                    console.log(d);
                    setCookie('user_userid', details.user_id, 30);
                    setCookie('user_username', details.user_username, 30);
                    setCookie('user_session', details.user_session, 30);
                    setCookie('user_email', details.user_email, 30);
                    $rootScope.$broadcast('user:updated', details);
                    console.log("A> " + user.session());
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

    // add confirm-on-exit attribute if your controller has isWorkUnsaved() and saveState() functions

    mainApp.directive('confirmOnExit',
    function() {

        return {
            link: function($scope, elem, attrs) {
                $scope.$on('$locationChangeStart', function(event, next, current) {
                    if (!$scope.saveState()) {
                        event.preventDefault();
                    }
                });
            }
        };
    });

    mainApp.config(['$routeProvider', '$locationProvider', '$modalProvider',
    function($routeProvider, $locationProvider) {

        $routeProvider.when('/', {
            templateUrl: 'gameList.html',
            controller: 'GameListController'
        }).when('/list', {
            templateUrl: 'gameList.html',
            controller: 'GameListController'
        }).when('/edit/:game_id', {
            templateUrl: 'editor.html',
            controller: 'EditorController',
            resolve: {
                readonly: function() { return false; }
            }
        }).when('/view/:game_id', {
            templateUrl: 'editor.html',
            controller: 'EditorController',
            resolve: {
                readonly: function() { return true; }
            }
        }).when('/help', {
            templateUrl: 'help.html'
        }).when('/viewStudents', {
            templateUrl: 'viewStudents.html',
            controller: 'StudentController'
        }).otherwise({
            redirectTo: '/'
        });
        $locationProvider.html5Mode(true);
    }]);

    mainApp.controller('MainController', ['$scope', '$modal', 'user', 'ajax',
    function($scope, $modal, user, ajax) {

        var hidden = [
                'document', 'window', 'alert', 'parent', 'frames', 'frameElment',
                'history', 'fullScreen', 'innerHeight', 'innerWidth', 'length',
                'location', 'GlobalEventHandlers', 'WindowEventHandlers', 'opener',
                'performance', 'screen'
            ],
            preScript = 'function ClientScript(' + hidden.join() + ') { "use strict";\n',
            postScript = '; this.updateFunction = (typeof update === "function") ? update : null; };';

        $scope.signInMessage = "Sign In";
        $scope.pane = '';
        $scope.status = '';
        $scope.isError = false;
        $scope.networkBusy = '';
        $scope.networkIcon = 'glyphicon-ok';
        $scope.user_id = user.id();

        $scope.$on('user:updated', function(msg, details) {
            if(details.user_id !== 0) {
                $scope.signInMessage = "Sign out " + details.user_username;
                $scope.reportStatus("Welcome back " + details.user_username);
            }
            else {
                $scope.signInMessage = "Sign In";
                $scope.reportStatus("Signed out");
            }
        });

        $scope.$on('status', function(e, msg) {
            $scope.reportStatus(msg);
        });

        $scope.$on('error', function(e, msg) {
            $scope.reportError(msg);
        });

        $scope.$on('network', function(e, msg) {
            $scope.setInProgress(msg);
        });

        $scope.$on('play', function(e, source) {
            var iframe = document.getElementById('gameFrame');
            $scope.reportStatus('');
            window.GameSource = preScript + source + postScript;
            iframe.src = '/static/frame.html';
            iframe.contentWindow.focus();
        });

        window.reportRuntimeError = function(e) {
            $scope.reportError(e.message);
            $scope.$broadcast('runtimeerror', e);
            $scope.$apply();
        };

        window.reportRuntimeErrorDirect = function(msg, line, column) {
            $scope.reportError(msg);
            $scope.$broadcast('editorGoto', {line: line, column: column, msg: msg});
            $scope.$apply();
        };

        $scope.toggleLogin = function() {
            if(user.isLoggedIn()) {
                user.logout().then($scope.apply);
            }
            else {
                user.login().then($scope.apply);
            }
        };

        $scope.reportError = function(text) {
            $scope.isError = true;
            $scope.status = text;
        };

        $scope.reportStatus = function(text) {
            $scope.isError = false;
            $scope.status = text;
        };

        $scope.setInProgress = function(p) {
            $scope.networkBusy = p;
            $scope.networkIcon = p ? 'glyphicon-repeat' : 'glyphicon-ok';
        };

        user.refreshSession().then(function() {
            $scope.$apply();
        });
    }]);

    // TODO (chs): save/restore state of which rows in gamelist were expanded

    mainApp.controller('GameListController', ['$scope', '$routeParams', 'dialog', 'user', 'ajax',
    function ($scope, $routeParams, dialog, user, ajax) {

        var refreshing = false;

        $scope.$parent.pane = 'Games';
        $scope.games = games;
        $scope.user_id = user.id();

        $scope.star = function(index, score) {
            return index <= score ? 'yellow' : 'white';
        };

        $scope.timer = function(t) {
            return moment(t).fromNow();
        };

        $scope.$on('user:updated', function(msg, details) {
            $scope.refreshGameList();
        });

        // search term
        // pqging, order by
        // 'my games'
        // 'top games'
        // 'new games'
        // 'most played'
        // 'games by Username'

        $scope.refreshGameList = function() {
            if(!refreshing) {
                refreshing = true;
                $scope.user_id = user.id();
                ajax.get('/api/list', { user_id: -1 }).then(function(result) {
                    $scope.games = result.games;
                    games = result.games;
                    $scope.$apply();
                    refreshing = false;
                });
            }
        };

        $scope.deleteIt = function(id, name) {
            dialog("Delete " + name + "!?", "Do you really want to delete " + name + "? This action cannot be undone", "Yes, delete it permanently", "No", 'btn-danger', 'btn-default')
            .then(function(result) {
                if(result) {
                    ajax.post('/api/delete', { game_id: id, user_id: user.id(), user_session: user.session() }, 'Deleting ' + name + '...', name + ' deleted', 'Error deleting game')
                    .then(function(result) {
                        $scope.refreshGameList();
                    });
                }
            });
        };

        $scope.playIt = function(id) {
            var s;
            ajax.get('/api/source', {game_id: id})
            .then(function(result) {
                $scope.$emit('play', result.source);
            });
        };

        if(games.length === 0) {
            $scope.refreshGameList();
        }

    }]);

    mainApp.controller('EditorController', ['$scope', '$modal', '$routeParams', 'user', 'readonly', 'ajax',
    function ($scope, $modal, $routeParams, user, readonly, ajax) {

        var newGameID = $routeParams.game_id;

        $scope.readonly = readonly;

        function highlightError(e) {
            var trace = printStackTrace({e:e}),
                re = /(.*)@(.*)\:(\d+):(\d+)/,
                parts = trace[0].match(re),
                line = parseInt(parts[3]),
                column = parseInt(parts[4]);

            // NOTE (chs): the dodgy line offsets are due to 0-based and 1-based differences and the preScript taking 1 line

            editor.gotoLine(line - 1, Math.max(0, column - 1), true);
            editor.session.setAnnotations([{
                row: line - 2,
                column: column - 1,
                text: e.message,
                type: 'error'
            }]);
            focusEditor();
        }

        $scope.$on('runtimeerror', function(m, e) {
            highlightError(e);
        });

        function setOptions(options) {
            if(editor) {
                editor.setTheme('ace/theme/' + options.theme.toLowerCase());
            }
        }

        $scope.$on('options', function(e, options) {
            setOptions(options);
        });

        $scope.$on('editorGoto', function(m, o) {
            editor.gotoLine(o.line - 1, o.column - 1, true);
            editor.session.setAnnotations([{
                row: o.line - 2,
                column: o.column - 1,
                text: o.msg,
                type: 'error'
            }]);
            focusEditor();
        });

        $scope.$parent.pane = 'Editor';

        $scope.gameName = '';

        $scope.options = editorOptions;

        editor = ace.edit("editor");
        editor.$blockScrolling = Infinity;
        editor.setReadOnly(readonly);

        $scope.isWorkUnsaved = function() {
            return !(editor && editor.session && editor.session.getUndoManager().isClean());
        };

        $scope.validateName = function() {
            var i,
                n = '',
                regex = /[\"\'\:\;\! \?\.\,\-a-zA-Z0-9]*/;
            for(i in $scope.gameName) {
                if (regex.test($scope.gameName[i])) {
                    n += $scope.gameName[i];
                }
            }
            $scope.gameName = n;
            name = n;
        };

        $scope.saveState = function() {
            source = editor.getValue();
            session = editor.getSession();
            name = $scope.gameName;
            localStorage.setItem('source', source);
            return true;
        };

        if(session && newGameID === game_id) {
            editor.setSession(session);
            $scope.gameName = name;
        }
        else {
            if($routeParams.game_id) {
                game_id = $routeParams.game_id;
                if($routeParams.game_id === 'new') {
                    $scope.gameName = 'New Game';
                }
                else {
                    try {
                        newGameID = parseInt(game_id);
                        ajax.get('/api/source', $routeParams, 'Getting game...')
                        .then(function(result){
                            editor.setValue(result.source, -1);
                            $scope.gameName = result.game_title;
                            editor.session.getUndoManager().reset();
                            $scope.$apply();
                        });
                    }
                    catch(e) {
                        // invalid number
                    }
                }
            }
            else {
                source = '// Catch the bright ones\n\nvar ship = {\n        x: 0,\n        y: 6,\n        color: 1,\n        glow: 0,\n        flash: 0,\n        speed: 0.25\n    },\n    time,\n    delay,\n    ticks,\n    frame,\n    state,\n    score,\n    dots;\n\nreset();\n\nfunction reset() {\n    time = 0;\n    delay = 10;\n    ticks = 0;\n    score = 0;\n    dots = [];\n    ship.speed = 0.25;\n    ship.flash = 0;\n    setState(playing);\n}\n\nfunction setState(s) {\n    state = s;\n    frame = 0;\n}\n\nfunction update() {\n    state();\n    time = ++time % delay;\n    if(time === 0) {\n        ++ticks;\n    }\n    ++frame;\n}\n\nfunction movePlayer() {\n    ship.x += (held("left") ? -ship.speed : 0) + (held("right") ? ship.speed : 0);\n    if(ship.x < 0) { ship.x = 0; }\n    if(ship.x > 6) { ship.x = 6; }\n}\n\nfunction moveDots() {\n    var i;\n    if(time === 0) {\n        for(i = 0; i < dots.length; ++i) {\n            dots[i].y += 1;\n            if(dots[i].y > 7)\n            {\n                dots.pop();\n            }\n        }\n        if((ticks % 5) === 0) {\n            dots.unshift({ x: (Math.random() * 8) >>> 0, y: 0, c: Math.random() > 0.8 ? 6 : 4 });\n        }\n    }\n}\n\nfunction checkCollision() {\n    var i,\n        dx,\n        px;\n    if(dots.length > 0) {\n        i = dots[dots.length - 1];\n        dx = i.x >>> 0;\n        px = ship.x >>> 0;\n        if(dx >= px && dx < px + 2 && i.y >= 6) {\n            if(i.c === 4) {\n                ship.flash = 30;\n                setState(dead);\n            }\n            else {\n                ship.speed += 0.05;\n                delay = Math.max(1, delay - 1);\n                dots.pop();\n                ++score;\n                ship.glow = 10;\n                ship.color = 2;\n            }\n        }\n    }\n}\n\nfunction drawScore() {\n    var i;\n    for(i=0; i<score; ++i) {\n        set(i, 7, 5);\n    }\n}\n\nfunction drawPlayer() {\n    var dx = ship.x >>> 0;\n    if(--ship.glow === 0) { ship.color = 1; }\n    if(ship.flash === 0 || --ship.flash / 4 % 1 !== 0) {\n        set(dx, ship.y, ship.color);\n        set(dx + 1, ship.y, ship.color);\n        set(dx, ship.y + 1, ship.color);\n        set(dx + 1, ship.y + 1, ship.color);\n    }\n}\n\nfunction drawDots() {\n    var i;\n    for(i = 0; i < dots.length; ++i) {\n        if(get(dots[i].x, dots[i].y) !== 5) {\n            set(dots[i].x, dots[i].y, dots[i].c);\n        }\n    }\n}\n\nfunction draw() {\n    clear();\n    drawScore();\n    drawPlayer();\n    drawDots();\n}\n\nfunction dead() {\n    draw();\n    if(frame > 30) {\n        reset();\n    }\n}\n\nfunction playing() {\n    movePlayer();\n    moveDots();\n    checkCollision();\n    draw();\n}\n';
                editor.setValue(source, -1);
                editor.session.getUndoManager().reset();
            }
        }

        editor.setShowPrintMargin(false);
        editor.setShowFoldWidgets(false);
        editor.getSession().setMode('ace/mode/javascript');
        setOptions(editorOptions);
        editor.setOptions({
            enableLiveAutocompletion: true,
        });

        editor.on('input', function() {
        });

        $scope.$on("$destroy", function(e) {
            // // OK: true
            // // Cancel: false
            // if(!(editor.session.getUndoManager().isClean() || confirm("Changes are not saved, really close the editor?"))) {
            //     e.preventDefault(); // this doesn't work for $destroy because it's a broadcast message
            // }
        });

        // TODO (chs): require session to save game

        $scope.saveIt = function() {
            var data;
            user.login().then(function(details) {
                data = {
                    user_id: details.user_id,
                    name: $scope.gameName,
                    source: editor.getValue()
                };
                ajax.post('/api/save', data, 'Saving ' + data.name, 'Saved ' + data.name, 'Error saving ' + data.name);
                games = []; // force a gamelist refresh
            });
        };

        $scope.runIt = function() {
            $scope.$emit('play', editor.getValue());
        };

        $scope.showOptions = function() {
            var oldOptions = angular.copy($scope.options);
            $modal.open({
                animation: true,
                templateUrl: 'editorOptionsModal.html',
                controller: 'EditorOptionsModalInstanceController',
                backdrop: false,
                resolve: {
                    options: function () {
                        return $scope.options;
                    }
                }
            }).result.then(function (result) {
                editorOptions = result;
                setOptions(editorOptions);
            }, function() {
                editorOptions = oldOptions;
                setOptions(editorOptions);
            });
        };

        function inflateEditor() {
            var editorRect = $("#editorContainer")[0].getBoundingClientRect(),
                width = editorRect.right - editorRect.left,
                height = editorRect.bottom - editorRect.top;
            $('#editor').height(height - 1).width(width); // -1 for the border
        }

        function enableKeyBindings() {
            editor.commands.addCommand({
                name:'save',
                bindKey: {
                    win: 'Ctrl-S',
                    mac: 'Command-S',
                    sender: 'editor|cli'
                },
                exec: $scope.saveIt
                });

            editor.commands.addCommand({
                name:'run',
                bindKey: {
                    win: 'Ctrl-R',
                    mac: 'Command-R',
                    sender: 'editor|cli'
                },
                exec: $scope.runIt
            });
        }

        function disableKeyBindings() {
            editor.commands.commmandKeyBinding = {};
        }

        function focusEditor() {
            focus();
            if(editor) {
                editor.focus();
            }
        }

        inflateEditor();
        enableKeyBindings();
        focusEditor();

    }]);

    mainApp.controller('LoginModalInstanceController', ['$scope', '$modal', '$modalInstance', 'user', 'ajax',
    function ($scope, $modal, $modalInstance, user, ajax) {
        
        $scope.user = user;
        $scope.user.failed = false;

        $scope.ok = function () {
            ajax.post('/api/login', user, 'Logging in ' + user.email + '...')
            .then(function(result) {
                $scope.user.failed = false;
                $modalInstance.close(result);
                reportStatus(result.user_username + " signed in");
            }, function(xhr) {
                $scope.user.failed = true;
                $scope.$apply();
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        $scope.showRegistration = function () {
            $modalInstance.close({'registration': 'required'});
        };
    }]);

    mainApp.controller('RegisterModalInstanceController', ['$scope', '$modal', '$modalInstance', 'user', 'ajax',
    function ($scope, $modal, $modalInstance, user, ajax) {

        $scope.user = user;
        $scope.message = 'Please fill in all required fields';
        $scope.user.failed = false;

        $scope.ok = function () {

            $scope.user.failed = false;
            ajax.post('/api/register', $scope.user, 'Registering...')
            .then(function done(result) {
                $modalInstance.close(result);
            }, function fail(xhr) {
                $scope.message = xhr.statusText;
                $scope.user.failed = true;
                $scope.$apply();
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        $scope.passmatch = function() {
            return $scope.user.password === $scope.user.password2;
        };
    }]);

    mainApp.controller('EditorOptionsModalInstanceController', ['$scope', '$modal', '$modalInstance', 'options',
    function ($scope, $modal, $modalInstance, options) {

        $scope.options = options;

        $scope.themes = [
            'Chrome',
            'Cobalt',
            'Monokai',
            'Eclipse',
            'TextMate'
        ];

        $scope.setTheme = function(t) {
            $scope.options.theme = $scope.themes[t];
            $scope.$emit('options', $scope.options);
        };

        $scope.ok = function() {
            $modalInstance.close($scope.options);
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };

    }]);

    mainApp.controller('DialogModalInstanceController', ['$scope', '$modal', '$modalInstance', 'options',
    function ($scope, $modal, $modalInstance, options) {

        $scope.options = options;

        $scope.ok = function() {
            $modalInstance.close();
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };

    }]);

})();
