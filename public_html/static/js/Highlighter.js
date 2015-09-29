mainApp.directive('highlight', ['$rootScope', function($rootScope) {

    function link(scope, element, attrs) {

        $('.backdropper').hide();

        $(element).on('focus', function() {
            oldz = $(element).css('z-index');
            $('.backdropper').css('z-index', 1500);
            $('.backdropper').show();
            $(element).css('z-index', 1501);
            $rootScope.$broadcast('highlighter:activate', element[0].name);
        });

        $(element).on('blur', function() {
            $('.backdropper').hide();
            $(element).css('z-index', oldz);
            $rootScope.$broadcast('highlighter:dismiss', element[0].name);
        });

        $('#backdropper').on('click', function() {
            $rootScope.$broadcast('highlighter:dismiss', element[0].name);
            $('.backdropper').hide();
            $(element).css('z-index', oldz);
            $(element).blur();
        });
    }

    return {
        restrict: 'A',
        scope: false,
        link: link
    };
}]);