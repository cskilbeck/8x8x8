mainApp.factory('status', [ '$rootScope',
function ($rootScope) {

    var isError = false,
        statusText = '';
    
    function status(text) {
        statusText = text;
        $rootScope.$broadcast('status', text);
    }

    status.error = function(text) {
        statusText = text;
        $rootScope.$broadcast('error', msg);
    };

    status.clear = function() {
        statusText = ' ';
        $rootScope.$broadcast('status', ' ');
    };

    status.isError = function() {
        return isError;
    };

    status.getText = function() {
        return statusText;
    };

    return status;

}]);
