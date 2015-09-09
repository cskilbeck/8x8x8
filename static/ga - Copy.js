var initGoogleAnalytics = function() {
    "option strict";
    (function(win, doc, scp, url, obj, el, node) {
        win.GoogleAnalyticsObject = obj;
        win[obj] = win[obj] || function() {
            (win[obj].q = win[obj].q || []).push(arguments);
        };
        win[obj].l = 1 * new Date();
        el = doc.createElement(scp);
        node = doc.getElementsByTagName(scp)[0];
        el.async = 1;
        el.src = url;
        node.parentNode.insertBefore(el, node);
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga('create', 'UA-67259053-1', 'auto');
    ga('send', 'pageview');
};
