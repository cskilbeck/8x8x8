mainApp.factory('player', [ '$rootScope', '$uibModal', 'ajax', 'status', 'dialog',
function ($rootScope, $uibModal, ajax, status, dialog) {
    "use strict";

    // ID 1 is used by the fixed player, subsequent ones are for modal popup players
    var nextID = 2,
        frames = {};

    console.log("Player!");

    function postMessage(id, text, data) {
        var payload = JSON.stringify({ message: text, data: data });
        if(frames[id].window) {
            frames[id].window.postMessage(payload, "*");
        }
        else {
            frames[id].messages.push(payload);
        }
    }

    window.addEventListener('message', function(e) {
        var payload, message, data, source;
        try {
            source = e.source;
            try {
                payload = JSON.parse(e.data);
                frameWindow = e.source;
                $rootScope.$broadcast('frame:' + payload.message, payload.data);
            }
            catch(SyntaxError) {
            }
        }
        catch(err) {

        }

    });

    $rootScope.$on('frame:frame-loaded', function(m, data) {
        var frameMessages = [];
        while(frameMessages.length > 0) {
            postMessage(frameMessages.shift());
        }
    });

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

        // run a game in the built-in player - id should be a number identifying the container div: #playerDivN
        start: function(id) {
            var e = $('#playerDiv' + id),
                frameid = "playerFrame" + id,
                frame = e.children();
            if(frame.length !== 1 || frame[0].tagName !== 'iframe' || !frame.hasClass('playerFrame') || frame.attr('id') !== frameid) {
                e.empty();
                frame = $("<iframe class='playerFrame' id='" + frameid + "' tabindex='1' sandbox='allow-scripts' src='/static/html/frame.html'></iframe>");
                frame.appendTo(e);
            }
            console.log(frame[0]);
        }
    };

    return player;

}]);
