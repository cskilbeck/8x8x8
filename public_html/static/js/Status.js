mainApp.factory('status', [ '$rootScope', '$timeout',
function ($rootScope, $timeout) {

    var isError = false,
        isBusy = false,
        statusText = '';
    
    function status(text) {
        statusText = text;
        $timeout(function() {
            statusText = '';
            isError = false;
        }, 2000);
    }

    status.error = function(text) {
        statusText = text;
        isError = true;
        $timeout(function() {
            statusText = '';
            isError = false;
        }, 3000);
    };

    status.busy = function(b) {
        isBusy = b;
        $timeout(function() {
            $rootScope.$apply();
        }, 100);
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

    // TODO (chs): put status.focus somewhere more appropriate

    status.focus = function(elem) {
        $timeout(function() {
            elem.focus();
        }, 100);
    };

    return status;

}]);
