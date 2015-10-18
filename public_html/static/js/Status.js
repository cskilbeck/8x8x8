mainApp.factory('status', [ '$rootScope', '$timeout',
function ($rootScope, $timeout) {

    var isError = false,
        isBusy = false,
        statusText = '';
    
    function status(text) {
        statusText = text;
        isError = false;
        $timeout(function() {
            statusText = '';
            isError = false;
        }, 2000);
    }

    status.error = function(text, seconds) {
        statusText = text;
        isError = true;
        $timeout(function() {
            statusText = '';
            isError = false;
        }, seconds * 1000);
    };

    status.busy = function(b) {
        isBusy = b;
        $timeout(function() {
            $rootScope.$apply();
        }, 100);
    };

    status.clear = function() {
        statusText = ' ';
        isError = false;
        isBusy = false;
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
