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
        gameSettings,
        codeChanges = 0,
        discardChanges = false,
        framerates = [60, 30, 20, 15, 10],
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

    mainApp.controller('EditorController', ['$scope', '$modal', '$routeParams', 'user', 'ajax', '$rootScope', 'gamelist', 'dialog', '$location', 'game', 'status', '$timeout',
    function ($scope, $modal, $routeParams, user, ajax, $rootScope, gamelist, dialog, $location, game, status, $timeout) {

        var newGameID = $routeParams.game_id;

        $scope.game = game;

        $scope.$emit('pane:loaded', 'editor');

        discardChanges = false;

         function focusEditor() {
            $timeout(function() {
                focus();
                if(editor) {
                    enableEditor(true);
                    editor.focus();
                }
            });
        }

        $scope.$on('frame:focus-editor', function() {
            focusEditor();
        });

        $scope.$on('frame:error', function(m, e) {
            var parts = printStackTrace({ e: e })[0].match(/.*@.*\:(\d+):(\d+)/);
            gotoError(e.message, parseInt(parts[1]), parseInt(parts[2]));
        });

        // NOTE (chs): the dodgy line offsets are due to 0-based and 1-based differences and the preScript taking 1 line
        function gotoError(msg, line, column) {
            status.error(msg);
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

        (function() {
            var opts = localStorage.getItem('editorOptions');
            if(opts) {
                editorOptions = JSON.parse(opts);
            }
            else {
                // TODO (chs): roaming options - load it from the database
            }

        })();

        startEditor();

        // TODO (chs): persist the editor object and its loaded modules for when we come back to this View
        function startEditor() {
            editor = ace.edit("editor");

            if(!modulesLoaded) {
                ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.0/');
                ace.config.set("modePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.0/");
                ace.config.set("workerPath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.0/");
                ace.config.set("themePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.0/");
                ace.config.loadModule('ace/ext/language_tools', function(m) {
                    ace.require(['ace/ext/language_tools']);
                    modulesLoaded = true;
                });
            }
            editor.getSession().setMode('ace/mode/javascript');
            setOptions(editorOptions);
            editor.$blockScrolling = Infinity;
            enableEditor(false);
            inflateEditor();

            editor.getSession().on('change', function(e) {
                ++codeChanges;
            });
        }

        $scope.isWorkUnsaved = function() {
            return !(editor && editor.session && editor.session.getUndoManager().isClean());
        };

        $scope.saveState = function() {
            source = editor.getValue();
            session = editor.getSession();
            localStorage.setItem('source', source);
            // TODO (chs): roaming options: save it to the database
            return true;
        };

        function resetUndo() {
            codeChanges = 0;
            editor.session.setUndoManager(new ace.UndoManager());
        }

        function noGame() {
            dialog.choose('Game not found', "I can't find game '" + game_id + "'. Would you like to create a new game?", "Yes", "No, go to the games list")
            .then(function(result) {
                game.game_title = 'New game';
                game.game_id = 'new';
                game.user_username = user.name();
                focusEditor();
                enableEditor(true);
            }, function() {
                session = null;
                $location.path('/list');
            });
        }

        $scope.runIt = function(forceRestart) {
            status.clearError();
            game.editing = true;
            game.game_source = editor.getValue();
            game.play(game, forceRestart);
        };

        function save() {
            game.game_source = editor.getValue();
            return game.save()
            .then(function() {
                codeChanges = 0;
            });
        }

        function enableEditor(enable) {
            editor.setReadOnly(!enable);
        }

        // DONE (chs): require session to save game

        $scope.saveIt = function() {
            if(game.game_title && game.game_title.length > 0) {
                user.login("Sign in to save " + game.game_title)
                .then(function(details) {
                    if(game.game_id === 'new') {
                        game.create(game)
                        .then(function(result) {
                            codeChanges = 0;
                            game_id = result.game_id;
                            $location.path('/edit/' + game_id);
                            $scope.$apply();
                            startEditor();
                            activateEditor();
                        }, function(xhr) {
                            if(xhr.status === 409) {
                                dialog.medium.choose('Game name already used',
                                    "'" + game.game_title + "' already exists, would you like to overwrite it? Warning, this will delete the original and cannot be undone",
                                    "Yes, overwrite it permanently",
                                    "No, do nothing")
                                .then(function() {
                                    game.find(user.id(), game.get_title())
                                    .then(function(result) {
                                        // TODO (chs): update the location bar to reflect the new game id
                                        game_id = result.game_id;
                                        save()
                                        .then(function() {
                                            $location.path('/edit/' + game_id);
                                            $scope.$apply();
                                            startEditor();
                                            activateEditor();
                                        });
                                    });
                                });
                            }
                        });
                    }
                    else {
                        save()
                        .then(function() {
                            // Game has been saved...
                        });
                    }
                    gamelist.reset();
                });
            }
            else {
                dialog.inform('A game needs a name', "Your game has no name - once you've set the name, you can save it")
                .then(function() {
                    game.game_title = "New Game";
                    $scope.$apply();
                    status.focus($("#game_title"));
                });
            }
        };

        function setOptions(options) {
            if(editor) {
                editor.setTheme('ace/theme/' + options.theme.toLowerCase());
                editor.setOptions(options.options);
                localStorage.setItem('editorOptions', JSON.stringify(editorOptions));
            }
        }

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
            var editorRect = $(".maincontainer")[0].getBoundingClientRect(),
                tbh = $('#editorToolbar'),
                width, height;
            if(tbh.length > 0) {
                tbh = tbh[0].clientHeight;
                width = editorRect.right - editorRect.left;
                height = (editorRect.bottom - editorRect.top) - tbh;
                $('#editorContainer').height(height - 1).width(width - 1); // -1 for the border
                $('#editor').height(height - 1).width(width - 1); // -1 for the border
                editor.resize();
            }
        }

        function saveSettings(settings) {
            gameSettings = settings;
            $scope.$emit('settings', gameSettings);
            user.login("Sign in to save settings")
            .then(function() {
                settings.game_id = game_id;
                ajax.post('settings', settings, 'Saving settings');
            });
        }

        $scope.showSettings = function() {
            gameSettings.game_title = $scope.gameName;
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
                exec: function() {
                    $scope.runIt(true);
                }
            });
        }

        function disableKeyBindings() {
            editor.commands.commmandKeyBinding = {};
        }

        function activateEditor() {
            enableKeyBindings();
            focusEditor();
            game.editing = true;
        }

        $scope.canDeleteIt = function() {
            return game_id !== 'new' && game.user_id === user.id() && game.editing;
        };

        $scope.canSaveIt = function() {
            return game_id === 'new' || game.user_id === user.id() && game.editing;
        };

        $scope.deleteIt = function() {
            if($scope.canDeleteIt()) {
                dialog.small.choose("Delete " + game.game_title + "!?",
                    "Do you really want to PERMANENTLY delete " + game.game_title + "? This action cannot be undone",
                    "Yes, delete it",
                    "No",
                    'btn-danger',
                    'btn-default')
                .then(function() {
                    return dialog.medium.choose("REALLY delete " + game.game_title + "????",
                        "Are you quite SURE you want to PERMANENTLY delete " + game.game_title + "? This action cannot be undone, at all, ever",
                        "Yes, delete it",
                        "No",
                        'btn-danger',
                        'btn-default');
                })
                .then(function() {
                    return gamelist.delete(game.game_id);
                })
                .then(function() {
                    game.reset();
                    gamelist.reset();
                    codeChanges = 0;
                    discardChanges = true;
                    $location.path('/list').replace();
                });
            }
        };

        if(session && newGameID === game_id) {
            editor.setSession(session);
            $scope.runIt(false);
        }
        else {
            if($routeParams.game_id) {
                game_id = $routeParams.game_id;
                if(game_id === 'new') {
                    game.game_title = 'New Game';
                    game.game_instructions = '';
                    game.game_source = '';
                    game.rating_stars = 0;
                    game.hover_rating = 0;
                    game.game_rating = 0;
                    game.game_id = game_id;
                    game.user_id = user.id();
                    game.user_username = user.name();
                    game.game_framerate = 2;
                    $scope.runIt(true);
                }
                else {
                    try {
                        try {
                            newGameID = parseInt(game_id);
                        }
                        catch(e) {
                            newGameID = 0;
                        }
                        if(newGameID) {
                            enableEditor(false);
                            game.user_id = 0;
                            game.load(newGameID)
                            .then(function(result) {
                                editor.setValue(result.game_source, -1);
                                resetUndo();
                                $scope.runIt(false);
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

        $scope.$on('$routeChangeStart', function(event, to, from) {
            var destination = to,
                changes = [],
                sourceChanged = codeChanges > 0;
            if(!discardChanges && (sourceChanged || game.changed())) {
                event.preventDefault();
                changes = game.changes();
                if(sourceChanged) {
                    changes.push('Code');
                }
                dialog.small.choose('Discard unsaved changes?', 'You have changed the ' + changes.join(' & ') + '. Do you want to lose these changes?', 'Yes, discard changes', "No").
                then(function() {
                    discardChanges = true;
                    $location.path(destination.originalPath);
                }, function() {
                    focusEditor();
                });
            }
        });

        $scope.$on("$destroy", function(e) {
            game.editing = false;
            $rootScope.$applyAsync();
            // // OK: true
            // // Cancel: false
            // if(!(editor.session.getUndoManager().isClean() || confirm("Changes are not saved, really close the editor?"))) {
            //     e.preventDefault(); // this doesn't work for $destroy because it's a broadcast message
            // }
        });

        $scope.$on('options', function(e, options) {
            setOptions(options);
        });

        $(window).resize(function(e) {
            inflateEditor();
        });

        activateEditor();

    }]);
})();

