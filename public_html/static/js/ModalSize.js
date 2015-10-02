mainApp.directive("modalSize", [
function() {

    function link(scope, elem, attr) {
        $(elem).addClass(attr.modalSize);
    }

    return {
        restrict: 'A',
        scope: {
            'modalSize': '='
        },
        link: link
    };
}]);
