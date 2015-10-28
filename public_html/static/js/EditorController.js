// TODO (chs): allow save undo (or maintain N versions or something)
// TODO (chs): font face & size in editor options

(function() {
    "use strict";

    var editor,
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

    mainApp.controller('EditorController', ['$scope', '$uibModal', '$routeParams', 'user', 'ajax', '$rootScope', 'gamelist', 'dialog', '$location', 'game', 'status', '$timeout', 'util', '$window', 'player',
    function ($scope, $uibModal, $routeParams, user, ajax, $rootScope, gamelist, dialog, $location, game, status, $timeout, util, $window, player) {

         function focusEditor() {
            $timeout(function() {
                focus();
                if(editor) {
                    enableEditor(true);
                    editor.focus();
                }
            });
        }

        // NOTE (chs): the dodgy line offsets are due to 0-based and 1-based differences and the preScript taking 1 line
        function gotoError(msg, line, column) {
            status.error(msg, 300);
            editor.gotoLine(line - 1, Math.max(0, column - 1), true);
            editor.getSession().setAnnotations([{
                row: line - 2,
                column: column - 1,
                text: msg,
                type: 'error'
            }]);
            focusEditor();
        }

        // TODO (chs): persist the editor object and its loaded modules for when we come back to this View
        function startEditor() {
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
            else {
            }
            editor = ace.edit($("#editorContainer")[0]);
            editor.getSession().setMode('ace/mode/javascript');
            setOptions(editorOptions);
            editor.$blockScrolling = Infinity;
            enableEditor(false);
            inflateEditor();

            editor.getSession().on('change', function(e) {
                ++codeChanges;
            });
        }

        function resetUndo() {
            codeChanges = 0;
            editor.getSession().setUndoManager(new ace.UndoManager());
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
                $location.path('/list');
            });
        }

        function setOptions(options) {
            if(editor) {
                editor.setTheme('ace/theme/' + options.theme.toLowerCase());
                editor.setOptions(options.options);
                util.save('editorOptions', editorOptions);
            }
        }

        function inflateEditor() {
            var editorRect = $(".maincontainer")[0].getBoundingClientRect(),
                tbh = $('#editorToolbar'),
                width, height;
            if(tbh.length > 0) {
                tbh = tbh[0].clientHeight;
                width = editorRect.right - editorRect.left;
                height = (editorRect.bottom - editorRect.top) - tbh;
                $('#editorContainer').height(height - 1).width(width - 1); // -1 for the border
                editor.resize(true);
                editor.renderer.updateFull(true);
            }
            else {
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

        function save() {
            game.game_source = editor.getValue();
            return game.save();
        }

        function enableEditor(enable) {
            editor.setReadOnly(!enable);
        }

        function newGame() {
            source = '// New game!\n//Put your source code here...\n\n\n//OK?';
            game.reset();
            editor.getSession().setValue(source, -1);
            game.game_id = game_id;
            codeChanges = 0;
            game.clearChanges();
            activateEditor();
            enableEditor(true);
        }

        $scope.$on('frame:focus-editor', function() {
            focusEditor();
        });

        $scope.$on('frame:error', function(m, e) {
            var parts = printStackTrace({ e: e })[0].match(/.*@.*\:(\d+):(\d+)/),
                line = parseInt(parts[1]),
                column = parseInt(parts[2]);
            if(game.wrapper) {
                line = game.wrapper.searchMap(line + 1);
                gotoError(e.message, line + 1, 0);
            }
            else {
                gotoError(e.message, parseInt(parts[1]), parseInt(parts[2]));
            }
        });

        $scope.$on('runtimeerror', function(m, e) {
            var parts = printStackTrace({ e: e })[0].match(/.*@.*\:(\d+):(\d+)/);
            gotoError(e.message, parseInt(parts[1]), parseInt(parts[2]));
        });

        $scope.$on('editorGoto', function(m, o) {
            gotoError(o.message, o.line + 1, o.column + 1);
        });

        $scope.$on('newgame', function() {
            newGame();
        });

        $scope.isWorkUnsaved = function() {
            return !(editor && editor.getSession() && editor.getSession().getUndoManager().isClean());
        };

        $scope.saveState = function() {
            source = editor.getValue();
            util.save('source', source);
            // TODO (chs): roaming options: save it to the database
            return true;
        };

        $scope.runIt = function(forceRestart) {
            status.clearError();
            game.editing = true;
            game.game_source = editor.getValue();
            game.play(game, forceRestart);
        };

        // DONE (chs): require session to save game

        $scope.saveIt = function() {
            var ng;
            if(game.game_title && game.game_title.length > 0) {
                user.login("Sign in to save " + game.game_title)
                .then(function(details) {
                    if(game.game_id === 'new' || game.user_id !== user.id()) {
                        game.game_source = editor.getValue();
                        game.create(game)
                        .then(function(result) {
                            codeChanges = 0;
                            game_id = result.game_id;
                            $location.path('/edit/' + game_id);
                        }, function(xhr) {
                            if(xhr.status === 409) {
                                dialog.medium.choose('Game name already used',
                                    "'" + game.game_title + "' already exists, would you like to overwrite it? Warning, this will delete the original and cannot be undone",
                                    "Yes, overwrite it permanently",
                                    "No, do nothing")
                                .then(function() {
                                    game.find(user.id(), game.game_title)
                                    .then(function(result) {
                                        // DONE (chs): update the location bar to reflect the new game id
                                        game_id = result.data.game_id;
                                        game.user_id = user.id();
                                        game.game_id = game_id;
                                        save()
                                        .then(function() {
                                            codeChanges = 0;
                                            $location.path('/edit/' + game_id);
                                        });
                                    });
                                });
                            }
                        });
                    }
                    else {
                        save()
                        .then(function() {
                            codeChanges = 0;// Game has been saved...
                        });
                    }
                    gamelist.reset();
                });
            }
            else {
                dialog.inform('A game needs a name', "Your game has no name - once you've set the name, you can save it")
                .then(function() {
                    $scope.$apply(function() {
                        game.game_title = "New Game";
                    });
                    util.focus($("#game_title"));
                });
            }
        };

        $scope.showOptions = function() {
            var oldOptions = angular.copy(editorOptions);
            $uibModal.open({
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

        $scope.showSettings = function() {
            gameSettings.game_title = $scope.gameName;
            var settings = angular.copy(gameSettings);
            $uibModal.open({
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
            source = '// New game!\n//Put your source code here...\n\n\n//OK?';
            editor.getSession().setValue(source);
            editor.getSession().$stopWorker();
            editor.destroy();
            editor = null;
            // // OK: true
            // // Cancel: false
            // if(!(editor.getSession().getUndoManager().isClean() || confirm("Changes are not saved, really close the editor?"))) {
            //     e.preventDefault(); // this doesn't work for $destroy because it's a broadcast message
            // }
        });

        $scope.$on('options', function(e, options) {
            setOptions(options);
        });

        var newGameID = $routeParams.game_id;

        $scope.game = game;

        $scope.$emit('pane:loaded', 'editor');

        discardChanges = false;

        $scope.$parent.pane = 'Editor';

        editorOptions = util.load('editorOptions') || editorOptions;

        function loadSource() {
            if($routeParams.game_id) {
                game_id = $routeParams.game_id;
                if(game_id === 'new') {
                    newGame();
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
                                game.clearChanges();
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

        $timeout(function() {
            startEditor();
            activateEditor();
            inflateEditor();
            loadSource();

            $(window).on('resize', function() {
                inflateEditor();
            });
        });

    }]);
})();

