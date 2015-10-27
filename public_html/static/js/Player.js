mainApp.factory('player', [ '$rootScope', '$uibModal', 'ajax', 'status', 'dialog',
function ($rootScope, $uibModal, ajax, status, dialog) {
    "use strict";

    // ID 1 is used by the fixed player, subsequent ones are for modal popup players
    var nextID = 2;

    console.log("Player!");

    var player = {

        // play a game in a modal dialog
        open: function(id) {
            var currentID = nextID++;
            $uibModal.open({
                animation: true,
                size: 'size256',
                templateUrl: '/static/html/playModal.html',
                controller: 'PlayerController'
            }).opened.then(function() {
                game.load(id)
                .then(function(gameData) {
                    game.play(gameData, true);
                }, function(response) {
                    // couldn't load game...
                });
            });
        },

        // run a game in the built-in player
        start: function(id) {

        }
    };

    return player;

}]);
