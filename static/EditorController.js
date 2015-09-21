// TODO (chs): allow save undo (or maintain N versions or something)

(function() {
    "use strict";

    var editor,
        session,
        source,
        name,
        game_id,
        editorOptions = {
            theme: 'Monokai',
            options: {
                enableLiveAutocompletion: true,
                showFoldWidgets: true,
                printMargin: 120,
                showLineNumbers: true,
                showPrintMargin: false
            }
        };

    mainApp.controller('EditorController', ['$scope', '$modal', '$routeParams', 'user', 'readonly', 'ajax', '$rootScope', 'games', 'dialog', '$location',
    function ($scope, $modal, $routeParams, user, readonly, ajax, $rootScope, games, dialog, $location) {

        var newGameID = $routeParams.game_id;

        $scope.readonly = readonly;

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

        editor = ace.edit("editor");

        ace.config.set("modePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.0/");
        ace.config.set("workerPath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.0/");
        ace.config.set("themePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.0/");

        setOptions(editorOptions);

        ace.config.loadModule('ace/ext/language_tools', function(m) {
            ace.require(['ace/ext/language_tools']);
            editor.getSession().setMode('ace/mode/javascript');
            setOptions(editorOptions);
        });


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
            // TODO (chs): roaming options: save it to the database
            return true;
        };

        function resetUndo() {
            editor.session.setUndoManager(new ace.UndoManager());
        }

        function noGame() {
            dialog('Game not found', "I can't find game '" + game_id + "'. Would you like to create a new game?", "Yes", "No, go back to games list")
            .then(function(result) {
                if(result) {
                    $scope.gameName = 'New Game';
                }
                else {
                    session = null;
                    $location.path('/');
                }
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
                            ajax.get('/api/source', $routeParams, 'Getting game...')
                            .then(function(result){
                                editor.setValue(result.source, -1);
                                $scope.gameName = result.game_title;
                                resetUndo();
                                $scope.$apply();
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
            }
        }

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
            if($scope.gameName) {
                user.login().then(function(details) {
                    data = {
                        user_id: user.id(),
                        user_session: user.session(),
                        name: $scope.gameName,
                        source: editor.getValue()
                    };
                    ajax.post('/api/save', data, 'Saving ' + data.name, 'Saved ' + data.name, 'Error saving ' + data.name);
                    games.reset();
                });
            }
            else {
                dialog('A game needs a name', "Your game has no name - once you've set the name, you can save it", "OK", null)
                .then(function() {
                    $("#gameName").focus();
                    $scope.gameName = "New Game";
                    $scope.$apply();
                });
            }
        };

        $scope.runIt = function() {
            $scope.$emit('play', editor.getValue());
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

