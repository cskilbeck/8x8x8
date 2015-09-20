(function() {
    "use strict";

    mainApp.config(['$routeProvider', '$locationProvider',
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
            resolve: { readonly: function() { return false; } }
        }).when('/view/:game_id', {
            templateUrl: 'editor.html',
            controller: 'EditorController',
            resolve: { readonly: function() { return true; } }
        }).when('/help', {
            templateUrl: 'help.html'
        }).otherwise({
            redirectTo: '/'
        });
        $locationProvider.html5Mode(true);
    }]);

})();
