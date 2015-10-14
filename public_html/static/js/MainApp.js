//////////////////////////////////////////////////////////////////////

if (window.location.protocol != "https:") {
    window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);
}

var mainApp = angular.module('mainApp', ['ngRoute', 'ngAnimate', 'ui.bootstrap', 'ngResource', 'mgcrea.ngStrap', 'mgcrea.ngStrap.tooltip']);

mainApp.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

//////////////////////////////////////////////////////////////////////
// - Browser support
// - responsive toolbar height/wrap
// - editor focus nightmare, & send all non-editor keypresses to the player
// - game_lastsaved and caching not working
// - ratings - make it better than a simple average (http://www.evanmiller.org/)
// - standalone player
//      - standalone player share buttons
//      - standalone player link to source
//      - standalone player rating (-> link to source)
// - home page
// / instructions/documentation/tooltips/popovers
// - telemetry/analytics - ga(...) everywhere
// - mobile player mouse/touch support (swipe UDLR & tap)
// - player in mobile browsers
// - user
//      - user permission bits
//      - delete/deactivate user accounts and username recycling (delete games and ratings? and then re-rate all the games they rated!? hmph...)
// - tutorials
//      - tetris tutorial
//      / sprites & collision tutorials
// - game list
//      - view 10/20/50/100 per page
//      - quick search buttons: my games, top ranked, most played, recently added, recently changed
//      - top games: clear search, order by ranking desc
//      - order by: name, created, modified, creator, rank, playcount
// / fix the get/set pixel/color APIs for numbers/strings
//////////////////////////////////////////////////////////////////////
// \ forking
// \ make minify.py handle multiple SCRIPT/STYLEBLOCKs
//      \ store screenshots as prebuilt pngs in the database as varbinary - less processing to serve...
//      \ get rid of editor toolbar altogether (options button overlays the editor in top right) [run,save,delete kept]
//      \ get rid of run button in editor pane (play button in the player) [nope, bad idea]
//      \ ? Make a game private/public [nope]
//      \- bcrypt password on client before transmission [https instead]
// \? make it like jsfiddle where games are all anonymous ? save without login would be cool...  [nah]
// \? comments
//      \? groups of users (and admins) for schools
//////////////////////////////////////////////////////////////////////
// + save current source in LocalStorage
// + web service
// + save to web service
// + login form validation
// + game list pane
// + nice date formatting (momentjs)
// + pane history
// + fix game list table (column widths etc)
// + proper query for game list (incorporate username)
// + feedback on save/execute
//      + Promise from login for what happens after (save, copy)
// + make main left pane fill available screen space (esp. editor) [sort of fixed, editor expands and scrollbar shows up when necessary]
// + fix editor height/scrolling [ugly JS hack]
// + ajax in progress spinner
// + callstack from runtime errors [not full callstack but line & column at least]
// + Convert to Angular with routing
// + finish help pane content
// + cache current game in editor for fast re-editing even after going back to the game list
// + split the javascript up (make mainApp a global)
// + get rid of all the local variables outside controllers
// + make a utility class for all the local functions
//      + refresh game list on logout
// + get rid of the titlebar
// + edit by game ID rather than game name, so changing the name renames the existing game rather than creating a new one
// + editor view/edit mode with forking etc [but no forking, user can copy/paste for now]
// + save user options [editor,...?] in the database and as cookies [just saved in localStorage for now]
// + differentiate between my games and others
// + make it 16x16
// + make it 16 colours
// + standalone player
// + register 256pixels.net
//      + track status of 'row expanded' by game_id and persist it
// + put everything in the right folder (static/js, static/css, static/html, templates etc)
// + screenshots - store screen as 256 nibbles in game_screenshot!
// + make minify.py handle STYLEBLOCKs as well
//      + game settings (frame rate, instructions)
//      + show screenshots in game list
//      + highlight color of expanded rows is lost on refresh
// + voting/rating
// + different share text based on whether it's your game or not
// + run it when editor pane is activated
//      + get player out of an iframe [kinda, the controls are out of it, which is what matters]
//      + edit settings directly in the player (name, instructions, framerate) - no modal
//      + fix location/url when it's /edit/new and they've saved/created it (should be /edit/game_id)
// + make the instructions line up the same in the editor and player [near enough]
// + rating in player
// + framerate in player
//      + mod_wsgi for REST api
//      + apache for static files
//      + http://256pixels.net
//      + only save settings when they hit the save button! and get rid of /api/settings
//      + game list scrolling broken
//      + key() instead of pressed() - with N key buffer ( and keyreleased() )
// + share button
//      + share button in player
// + ALL games editable, only require login when you try and save it [actually done now]
// + layout so toolbars don't scroll off the top [an ongoing nightmare]
//      + flex instead of table layout for game list
//      + rating_stars not updating when user changes
//      + check if game name exists on create as well as save
// + ask if they want to save when quitting the editor if changes are unsaved
//      + update screenshot when it's taken (add a query parameter to the url) [bah, can't make this work very well] [fixed now]
// + fix the docs
//      + SSL for login/register [SSL for everything via cloudflare]
// + Google Ad
// + screenshots
// + get the database password out of github
// + backdropper flash on page load
// + work out how to run it from [azure|aws|digitalocean] on Debian [DigitalOcean]
//      + database on another machine
//      + compressed assets (editor require() stuff and glyphicons not working) [near enough]
// +! save as new user loses changes !
//      +- user profile modal dialog to change username\email\password [buggy but good enough for now]
//      +- make the search text work (timeout on change)
// +- detect hangs and kill it (possible? with instrumentation via Esprima : for, while, do) (but how to keep the source line matched up? sounds hard... https://github.com/CodeCosmos/codecosmos/blob/master/www/js/sandbox.js)
//      +- row/box layout option
//      +- paging in game list
// +- unicode
//      +- proper session security [JWT]
// +! angular-strap and angular-ui $modal clash...
