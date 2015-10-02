//////////////////////////////////////////////////////////////////////

var mainApp = angular.module('mainApp', ['ngRoute', 'ngAnimate', 'ui.bootstrap']);

//////////////////////////////////////////////////////////////////////
// - ratings - make it better than a simple average (http://www.evanmiller.org/)
// - standalone player
//      - standalone player share buttons
//      - standalone player link to source
//      - standalone player rating (-> link to source)
// - screenshots
// - home page
// - fix the docs
// - ask if they want to save when quitting the editor if changes are unsaved
//
// - detect hangs and kill it (possible? with instrumentation via Esprima : for, while, do) (but how to keep the source line matched up? sounds hard...)
// / instructions/documentation/tooltips/popovers
//
// / work out how to run it from [azure|aws|digitalocean] on Debian with:
//      - database on another machine
//      - compressed assets (editor require() stuff and glyphicons not working)
// - telemetry/analytics
//
// - mobile
//      - mobile player mouse/touch support (swipe UDLR & tap)
//      - player in mobile browsers
//
// - comments
//
// - editor
//      - get rid of toolbar altogether (options button overlays the editor in top right)
//      - get rid of run button in editor pane (play button in the player)
//      - check if game name exists on create as well as save
//
// - user registration/login/forgot password
//      - user profile modal dialog to change username\email\password
//      - bcrypt password on client before transmission
//      - permission bits
//      - proper session security
//
// - tutorials
//      - tetris
//      / sprites & collision
//
// - game list
//      - ? Make a game private/public
//      - paging in game list
//      - make the search text work (timeout on change)
//      - quick search buttons: my games, top games, most played, recently added, recently changed
//      - row/box layout option
//      - update screenshot when it's taken (add a query parameter to the url) [bah, can't make this work very well]
//
// ? groups of users (and admins) for schools
//
// - api
//      / fix the get/set pixel/color APIs for numbers/strings
//
//////////////////////////////////////////////////////////////////////
// \ forking
// \ make minify.py handle multiple SCRIPT/STYLEBLOCKs
//      \ store screenshots as prebuilt pngs in the database as varbinary - less processing to serve...
//
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
