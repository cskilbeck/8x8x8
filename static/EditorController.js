(function() {
    "use strict";

    var editor,
        session,
        source,
        name,
        game_id,
        editorOptions = {
            theme: 'Monokai'
        };

    mainApp.controller('EditorController', ['$scope', '$modal', '$routeParams', 'user', 'readonly', 'ajax', '$rootScope', 'games',
    function ($scope, $modal, $routeParams, user, readonly, ajax, $rootScope, games) {

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
                games.reset();
            });
        };

        $scope.runIt = function() {
            $scope.$emit('play', editor.getValue());
        };

        function setOptions(options) {
            if(editor) {
                editor.setTheme('ace/theme/' + options.theme.toLowerCase());
            }
        }

        $scope.$on('options', function(e, options) {
            setOptions(options);
        });

        $scope.showOptions = function() {
            var oldOptions = angular.copy(editorOptions);
            $modal.open({
                animation: true,
                templateUrl: 'editorOptionsModal.html',
                controller: 'EditorOptionsModalInstanceController',
                backdrop: false,
                resolve: {
                    options: function () {
                        return editorOptions;
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
})();

