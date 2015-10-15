(function() {
    "use strict";

    mainApp.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider.when('/', {
            templateUrl: '/static/html/home.html',
            controller: 'HomeController'
        }).when('/list', {
            templateUrl: '/static/html/gameList.html',
            reloadOnSearch: false,
            controller: 'GameListController'
        }).when('/edit/:game_id', {
            templateUrl: '/static/html/editor.html',
            controller: 'EditorController'
        }).when('/view/:game_id', {
            templateUrl: '/static/html/editor.html',
            controller: 'EditorController'
        }).when('/help', {
            templateUrl: '/static/html/help.html',
            controller: 'HelpController'
        }).otherwise({
            redirectTo: '/'
        });
        $locationProvider.html5Mode(true);
    }]);

})();
