// TODO (chs): allow save undo (or maintain N versions or something)
// TODO (chs): font face & size in editor options

(function() {
    "use strict";

    var editor,
        session,
        source,
        modulesLoaded = false,
        name,
        game_id,
        framerates = [60, 30, 20, 15, 10],
        gameSettings = {
            instructions: '',
            framerate: 0,
            name: ''
        },
        editorOptions = {
            theme: 'Monokai',
            options: {
                enableLiveAutocompletion: true,
                showFoldWidgets: true,
                printMargin: 120,
                showLineNumbers: true,
                highlightActiveLine: true,
                highlightGutterLine: true,
                displayIndentGuides: true,
                showPrintMargin: false
            }
        };

    mainApp.controller('EditorController', ['$scope', '$modal', '$routeParams', 'user', 'readonly', 'ajax', '$rootScope', 'games', 'dialog', '$location',
    function ($scope, $modal, $routeParams, user, readonly, ajax, $rootScope, games, dialog, $location) {

        var newGameID = $routeParams.game_id;

        $scope.readonly = readonly;

        $scope.$emit('pane:loaded', 'editor');

        window.focusEditor = function() {
            focus();
            if(editor) {
                editor.focus();
                enableEditor(true);
            }
        };

        // NOTE (chs): the dodgy line offsets are due to 0-based and 1-based differences and the preScript taking 1 line
        function gotoError(msg, line, column) {
            editor.gotoLine(line - 1, Math.max(0, column - 1), true);
            editor.session.setAnnotations([{
                row: line - 2,
                column: column - 1,
                text: msg,
                type: 'error'
            }]);
            focusEditor();
        }

        $scope.$on('runtimeerror', function(m, e) {
            var parts = printStackTrace({ e: e })[0].match(/.*@.*\:(\d+):(\d+)/);
            gotoError(e.message, parseInt(parts[1]), parseInt(parts[2]));
        });

        $scope.$on('editorGoto', function(m, o) {
            gotoError(o.msg, o.line, o.column);
        });

        $scope.$parent.pane = 'Editor';

        $scope.gameName = '';

        (function() {
            var opts = localStorage.getItem('editorOptions');
            if(opts) {
                editorOptions = JSON.parse(opts);
            }
            else {
                // TODO (chs): roaming options - load it from the database
            }

        })();

        // TODO (chs): persist the editor object and its loaded modules for when we come back to this View
        editor = ace.edit("editor");

        setOptions(editorOptions);

        if(!modulesLoaded) {
            ace.config.set("modePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.0/");
            ace.config.set("workerPath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.0/");
            ace.config.set("themePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.0/");
            ace.config.loadModule('ace/ext/language_tools', function(m) {
                ace.require(['ace/ext/language_tools']);
                editor.getSession().setMode('ace/mode/javascript');
                setOptions(editorOptions);
                modulesLoaded = true;
            });
        }
        else {
            editor.getSession().setMode('ace/mode/javascript');
            setOptions(editorOptions);
        }

        editor.$blockScrolling = Infinity;
        enableEditor(false);

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
            // TODO (chs): roaming options: save it to the database
            return true;
        };

        function resetUndo() {
            editor.session.setUndoManager(new ace.UndoManager());
        }

        function noGame() {
            dialog.choose('Game not found', "I can't find game '" + game_id + "'. Would you like to create a new game?", "Yes", "No, go to the games list")
            .then(function(result) {
                $scope.gameName = 'New Game';
                game_id = 'new';
                focusEditor();
                enableEditor(true);
            }, function() {
                session = null;
                $location.path('/list');
            });
        }

        if(session && newGameID === game_id) {
            editor.setSession(session);
            $scope.gameName = name;
        }
        else {
            if($routeParams.game_id) {
                game_id = $routeParams.game_id;
                if(game_id === 'new') {
                    $scope.gameName = 'New Game';
                }
                else {
                    try {
                        newGameID = parseInt(game_id);
                        if(newGameID) {
                            enableEditor(false);
                            ajax.get('/api/source', $routeParams, 'Getting game...')
                            .then(function(result){
                                editor.setValue(result.game_source, -1);
                                $scope.gameName = result.game_title;
                                gameSettings.instructions = result.game_instructions || "";
                                gameSettings.framerate = result.game_framerate || 0;
                                gameSettings.gameName = result.game_title;
                                resetUndo();
                                $scope.$apply();
                                enableEditor(true);
                            }, function(xhr) {
                                noGame();
                            });
                        }
                        else {
                            noGame();
                        }
                    }
                    catch(e) {
                        noGame();
                    }
                }
            }
            else {
                source = '// Huh?';
                editor.setValue(source, -1);
                resetUndo();
                enableEditor(true);
            }
        }

        editor.on('input', function() {
        });

        $("#editor").click(function(e) {
            focusEditor();
        });

        $scope.$on("$destroy", function(e) {
            // // OK: true
            // // Cancel: false
            // if(!(editor.session.getUndoManager().isClean() || confirm("Changes are not saved, really close the editor?"))) {
            //     e.preventDefault(); // this doesn't work for $destroy because it's a broadcast message
            // }
        });

        function save() {
            var data = {
                game_id: parseInt(game_id),
                user_id: user.id(),
                user_session: user.session(),
                name: $scope.gameName,
                source: editor.getValue()
            };
            ajax.post('/api/save', data, 'Saving ' + data.name, 'Saved ' + data.name, 'Error saving ' + data.name);
        }

        function enableEditor(enable) {
            editor.setReadOnly(!enable || readonly);
        }

        // DONE (chs): require session to save game

        $scope.saveIt = function() {
            var data;
            if($scope.gameName) {
                user.login().then(function(details) {
                    if(game_id === 'new') {
                        data = {
                            user_id: user.id(),
                            user_session: user.session(),
                            name: $scope.gameName,
                            source: editor.getValue()
                        };
                        ajax.post('/api/create', data, 'Creating ' + data.name, 'Created ' + data.name)
                        .then(function(result) {
                            game_id = result.game_id;
                            // $location.path('/edit/' + game_id).replace();
                            // $scope.$apply();
                        }, function(xhr) {
                            if(xhr.status === 401) {
                                dialog.choose('Game name already used',
                                    "'" + data.name + "' already exists, would you like to overwrite it? Warning, this will delete the original and cannot be undone",
                                    "Yes, overwrite it permanently",
                                    "No, do nothing")
                                .then(function() {
                                    ajax.get('/api/gameid', { user_id: user.id(), name: data.name })
                                    .then(function(result) {
                                        // TODO (chs): update the location bar to reflect the new game id
                                        game_id = result.game_id;
                                        save();
                                        // $location.path('/edit/' + game_id).replace();
                                        // $scope.$apply();
                                    });
                                });
                            }
                        });
                    }
                    else {
                        save();
                    }
                    games.reset();
                });
            }
            else {
                dialog.inform('A game needs a name', "Your game has no name - once you've set the name, you can save it")
                .then(function() {
                    $("#gameName").focus();
                    $scope.gameName = "New Game";
                    $scope.$apply();
                });
            }
        };

        $scope.runIt = function() {
            $scope.$emit('status', '');
            $scope.$emit('play', { source: editor.getValue(), name: $scope.gameName, instructions: gameSettings.instructions, game_id: game_id, framerate: gameSettings.framerate } );
        };

        function setOptions(options) {
            if(editor) {
                editor.setTheme('ace/theme/' + options.theme.toLowerCase());
                editor.setOptions(options.options);
                localStorage.setItem('editorOptions', JSON.stringify(editorOptions));
            }
        }

        $scope.$on('options', function(e, options) {
            setOptions(options);
        });

        $scope.showOptions = function() {
            var oldOptions = angular.copy(editorOptions);
            $modal.open({
                animation: true,
                templateUrl: '/static/html/editorOptionsModal.html',
                controller: 'EditorOptionsModalInstanceController',
                backdrop: false,
                resolve: {
                    options: function () {
                        return editorOptions;
                    }
                }
            }).result.then(function (result) {
                focusEditor();
                editorOptions = result;
                setOptions(editorOptions);
            }, function() {
                focusEditor();
                editorOptions = oldOptions;
                setOptions(editorOptions);
            });
        };

        function inflateEditor() {
            var editorRect = $("#editorContainer")[0].getBoundingClientRect(),
                width = editorRect.right - editorRect.left,
                height = editorRect.bottom - editorRect.top;
            $('#editor').height(height - 1).width(width); // -1 for the border
            editor.resize();
        }

        $(window).resize(function(e) {
            inflateEditor();
        });

        function saveSettings(settings) {
            gameSettings = settings;
            user.login()
            .then(function() {
                settings.user_id = user.id();
                settings.user_session = user.session();
                settings.game_id = game_id;
                return ajax.post('/api/settings', settings, function(result) {
                    $scope.gameInstructions = settings.instructions;
                });
            });
        }

        $scope.showSettings = function() {
            gameSettings.gameName = $scope.gameName;
            var settings = angular.copy(gameSettings);
            $modal.open({
                animation: true,
                templateUrl: '/static/html/gameSettingsModal.html',
                controller: 'GameSettingsModalInstanceController',
                resolve: {
                    settings: function() {
                        return settings;
                    }
                }
            }).result.then(function(result) {
                focusEditor();
                saveSettings(settings);
            }, function() {
                focusEditor();
            });
        };

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

        inflateEditor();
        enableKeyBindings();
        focusEditor();

    }]);
})();

