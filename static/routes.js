(function() {
    "use strict";

    var editor,
        session,
        source,
        mainApp,
        editorOptions = {
            theme: 'Monokai'
        },
        user_id = 0,
        user_session,
        user_name;

    function doAjax(func, url, data, progress, complete, fail) {
        var q = Q.defer();
//        spinner(true);
//        reportStatus(progress || '');
        func(url, data)
        .done(function(result) {
            // spinner(false);
            // reportStatus(complete || '');
            q.resolve(result);
        })
        .fail(function(xhr) {
            // spinner(false);
            // reportError(fail || '');
            q.reject(xhr);
        });
        return q.promise;
    }

    function JSONToObject(str) {
    }

    function objectToJSON(obj) {
    }

    function format(str, col) {
        col = typeof col === 'object' ? col : Array.prototype.slice.call(arguments, 1);
        return str.replace(/\{\{|\}\}|\{(\w+)\}/g, function (m, n) {
            if (m == '{{') { return '{'; }
            if (m == '}}') { return '}'; }
            return col[n];
        });
    }

    function get(url, data, progress, complete, fail) {
        // data.user_session = user_session;
        // data.user_id = data.user_id || user_id || 0;
        return doAjax($.get, url, data, progress, complete, fail);
    }

    function post(url, data, progress, complete, fail) {
        // data.user_session = user_session;
        // data.user_id = user_id || 0;
        return doAjax($.post, url, data, progress, complete, fail);
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

    function setOptions(o) {
        if(editor) {
            editor.setTheme('ace/theme/' + o.theme.toLowerCase());
        }
    }

    mainApp = angular.module("mainApp", ['ngRoute', 'ngAnimate', 'ui.bootstrap']);

    mainApp.config(['$routeProvider', '$locationProvider', '$modalProvider', function($routeProvider, $locationProvider) {
        $routeProvider.when('/', {
            templateUrl: 'gameList.html',
            controller: 'GameListController'
        }).when('/list', {
            templateUrl: 'gameList.html',
            controller: 'GameListController'
        }).when('/edit/:gameid', {
            templateUrl: 'editor.html',
            controller: 'EditorController'
        }).when('/help', {
            templateUrl: 'help.html',
            controller: 'HelpController'
        }).when('/viewStudents', {
            templateUrl: 'viewStudents.html',
            controller: 'StudentController'
        }).otherwise({
            redirectTo: '/'
        });
        $locationProvider.html5Mode(true);
    }]);

    mainApp.controller('MainController', function mainAppController($scope) {
        $scope.pane = "";
    });

    mainApp.controller('HelpController', function helpController($scope) {
    });

    mainApp.controller('GameListController', function gameListController($scope, $routeParams) {
        $scope.$parent.pane = 'Games';
        $scope.games = [];

        $scope.star = function(index, score) {
            return index <= score ? 'yellow' : 'white';
        };

        $scope.timer = function(t) {
            return moment(t).fromNow();
        };

        get('/api/list', { user_id: -1 })
        .then(function(result) {
            console.log(result.games);
            $scope.games = result.games;
            $scope.$apply();
        },
        function(xhr) {
            //setStatus(xhr.statusText);
        });
    });

    mainApp.controller('EditorController', function editController($scope, $modal, $routeParams) {

        $scope.$parent.pane = 'Editor';

        $scope.options = editorOptions;

        if(!source) {
            source = '// Catch the bright ones\n\nvar ship = {\n        x: 0,\n        y: 6,\n        color: 1,\n        glow: 0,\n        flash: 0,\n        speed: 0.25\n    },\n    time,\n    delay,\n    ticks,\n    frame,\n    state,\n    score,\n    dots;\n\nreset();\n\nfunction reset() {\n    time = 0;\n    delay = 10;\n    ticks = 0;\n    score = 0;\n    dots = [];\n    ship.speed = 0.25;\n    ship.flash = 0;\n    setState(playing);\n}\n\nfunction setState(s) {\n    state = s;\n    frame = 0;\n}\n\nfunction update() {\n    state();\n    time = ++time % delay;\n    if(time === 0) {\n        ++ticks;\n    }\n    ++frame;\n}\n\nfunction movePlayer() {\n    ship.x += (held("left") ? -ship.speed : 0) + (held("right") ? ship.speed : 0);\n    if(ship.x < 0) { ship.x = 0; }\n    if(ship.x > 6) { ship.x = 6; }\n}\n\nfunction moveDots() {\n    var i;\n    if(time === 0) {\n        for(i = 0; i < dots.length; ++i) {\n            dots[i].y += 1;\n            if(dots[i].y > 7)\n            {\n                dots.pop();\n            }\n        }\n        if((ticks % 5) === 0) {\n            dots.unshift({ x: (Math.random() * 8) >>> 0, y: 0, c: Math.random() > 0.8 ? 6 : 4 });\n        }\n    }\n}\n\nfunction checkCollision() {\n    var i,\n        dx,\n        px;\n    if(dots.length > 0) {\n        i = dots[dots.length - 1];\n        dx = i.x >>> 0;\n        px = ship.x >>> 0;\n        if(dx >= px && dx < px + 2 && i.y >= 6) {\n            if(i.c === 4) {\n                ship.flash = 30;\n                setState(dead);\n            }\n            else {\n                ship.speed += 0.05;\n                delay = Math.max(1, delay - 1);\n                dots.pop();\n                ++score;\n                ship.glow = 10;\n                ship.color = 2;\n            }\n        }\n    }\n}\n\nfunction drawScore() {\n    var i;\n    for(i=0; i<score; ++i) {\n        set(i, 7, 5);\n    }\n}\n\nfunction drawPlayer() {\n    var dx = ship.x >>> 0;\n    if(--ship.glow === 0) { ship.color = 1; }\n    if(ship.flash === 0 || --ship.flash / 4 % 1 !== 0) {\n        set(dx, ship.y, ship.color);\n        set(dx + 1, ship.y, ship.color);\n        set(dx, ship.y + 1, ship.color);\n        set(dx + 1, ship.y + 1, ship.color);\n    }\n}\n\nfunction drawDots() {\n    var i;\n    for(i = 0; i < dots.length; ++i) {\n        if(get(dots[i].x, dots[i].y) !== 5) {\n            set(dots[i].x, dots[i].y, dots[i].c);\n        }\n    }\n}\n\nfunction draw() {\n    clear();\n    drawScore();\n    drawPlayer();\n    drawDots();\n}\n\nfunction dead() {\n    draw();\n    if(frame > 30) {\n        reset();\n    }\n}\n\nfunction playing() {\n    movePlayer();\n    moveDots();\n    checkCollision();\n    draw();\n}\n';
        }

        editor = ace.edit("editor");
        editor.$blockScrolling = Infinity;
        if(session) {
            editor.setSession(session);
        }
        else {
            editor.setValue(source, -1);
            editor.session.getUndoManager().reset();
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

        $scope.$on("$destroy", function() {
            source = editor.getValue();
            session = editor.getSession();
            localStorage.setItem('source', editor.getValue());
        });

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

        $('#gameName').bind('keypress', function (event) {
            var regex = new RegExp("^[\'\:\;\! \?\.\,a-zA-Z0-9]+$");
            var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
            if (!regex.test(key)) {
               event.preventDefault();
               return false;
            }
        });

        function saveIt() {
            console.log("SaveIt");
        }

        function runIt() {
            console.log("RunIt");
        }

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
                exec: saveit
                });

            editor.commands.addCommand({
                name:'run',
                bindKey: {
                    win: 'Ctrl-R',
                    mac: 'Command-R',
                    sender: 'editor|cli'
                },
                exec: runit
            });
        }

        function disableKeyBindings() {
            editor.commands.commmandKeyBinding = {};
        }

        inflateEditor();
        enableKeyBindings();
    });

    mainApp.controller('LoginModalController', function loginModalController($scope, $modal) {

        $scope.user =  {
            username: '',
            email: '',
            password: '',
            password2: '',
            failed: false
        };

        $scope.signInMessage = "Sign In";

        function signIn(result) {
            user_id = result.user_id;
            user_session = result.user_session;
            user_name = result.user_username;
            setCookie('user_userid', user_id, 30);
            setCookie('user_username', user_name, 30);
            setCookie('user_session', user_session, 30);
            //reportStatus("Welcome back " + user_name);
            $scope.signInMessage = "Sign out " + result.user_username;
        }

        function signOut() {
            user_id = 0;
            user_name = null;
            user_session = null;
            clearCookie('user_session');
            clearCookie('user_username');
            clearCookie('user_userid');
            $scope.signInMessage = "Sign In";
        }

        $scope.showLoginDialog = function () {
            if(user_id !== 0) {
                get('/api/endSession', { user_id: user_id, user_session: user_session }, 'Logging ' + user_name + ' out...')
                .then(function() {
                    signOut();
                    $scope.$apply();    // need this because not using angular ui for this
                }, function() {
                    // endSession failed!?
                });
            }
            else {
                $modal.open({
                    animation: true,
                    templateUrl: 'loginModal.html',
                    controller: 'LoginModalInstanceController',
                    resolve: {
                        user: function () {
                            return $scope.user;
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
                                    return $scope.user;
                                }
                            }
                        }).result.then(function(result) {
                            signIn(result);
                        });
                    }
                    else {
                        signIn(result);
                    }
                });
            }
        };
    });

    mainApp.controller('LoginModalInstanceController', function loginModalInstanceController($scope, $modalInstance, user) {
        $scope.user = user;
        $scope.user.failed = false;

        $scope.ok = function () {
            post('/api/login', user)
            .then(function(result) {
                $scope.user.failed = false;
                $modalInstance.close(result);
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
    });

    mainApp.controller('RegisterModalInstanceController', function registerModalInstanceController($scope, $modalInstance, user) {
        $scope.user = user;
        $scope.message = 'Please fill in all required fields';
        $scope.user.failed = false;

        $scope.ok = function () {

            $scope.user.failed = false;
            post('/api/register', $scope.user, 'Registering...', '', 'Error registering')
            .then(function done(result) {
                $modalInstance.close(result);
            }, function fail(xhr) {
                $scope.message = xhr.statusText;
                $scope.user.failed = true;
            });
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };

        $scope.passmatch = function() {
            return $scope.user.password === $scope.user.password2;
        };
    });

    mainApp.controller('EditorOptionsModalInstanceController', function editorOptionsModalInstanceController($scope, $modalInstance, options) {

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
            setOptions($scope.options);
        };

        $scope.ok = function() {
            $modalInstance.close($scope.options);
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };

    });

})();
