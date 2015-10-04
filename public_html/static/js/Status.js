mainApp.factory('status', [ '$rootScope', '$timeout',
function ($rootScope, $timeout) {

    var isError = false,
        isBusy = false,
        statusText = '';
    
    function status(text) {
        statusText = text;
        $timeout(function() {
            statusText = '';
        }, 1000);
    }

    status.error = function(text) {
        statusText = text;
    };

    status.busy = function(b) {
        isBusy = b;
    };

    status.clear = function() {
        statusText = ' ';
    };

    status.clearError = function() {
        if(isError) {
            statusText = '';
            isError = false;
        }
    };

    status.isError = function() {
        return isError;
    };

    status.getText = function() {
        return statusText;
    };

    status.isBusy = function() {
        return isBusy;
    };

    return status;

}]);
