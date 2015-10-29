window.fbAsyncInit = function() {
    FB.init({
        appId      : '1685374728350676',
        xfbml      : true,
        version    : 'v2.4'
    });
};

$(window).load(function() {
    var js, fjs = document.getElementsByTagName('script')[0];
    if (!document.getElementById('facebook-jssdk')) {
        js = document.createElement('script');
        js.id = 'facebook-jssdk';
        js.src = "//connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
    }
    document.title = "DEV Little Mini Games";
});

