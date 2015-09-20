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

    mainApp.controller('EditorController', ['$scope', '$modal', '$routeParams', 'user', 'readonly', 'ajax', '$rootScope', 'games', 'dialog', '$location',
    function ($scope, $modal, $routeParams, user, readonly, ajax, $rootScope, games, dialog, $location) {

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
                                editor.session.getUndoManager().reset();
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

