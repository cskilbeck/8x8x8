
var mainApp = angular.module("mainApp", ['ngRoute']);

mainApp.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.when('/', {
        templateUrl: 'home.html',
        controller: 'StudentController'
    }).when('/viewStudents', {
        templateUrl: 'viewStudents.html',
        controller: 'StudentController'
    }).otherwise({
        redirectTo: '/'
    });
    $locationProvider.html5Mode(true);
}]);

mainApp.controller('StudentController', function($scope) {
    $scope.students = [{
        name: 'Mark Waugh',
        city: 'New York'
    }, {
        name: 'Steve Jonathan',
        city: 'London'
    }, {
        name: 'John Marcus',
        city: 'Paris'
    }];
    $scope.message = "Click on the hyper link to view the students list.";
});
