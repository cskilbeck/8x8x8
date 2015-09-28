//////////////////////////////////////////////////////////////////////

var mainApp = angular.module('mainApp', ['ngRoute', 'ngAnimate', 'ui.bootstrap']);

//////////////////////////////////////////////////////////////////////
// - screenshots
//      - store screenshots as prebuilt pngs in the database as varbinary - less processing to serve...
//      - update screenshot when it's taken (add a query parameter to the url)
// - 
// - mouse/touch support (swipe UDLR & tap)
// - detect hangs and kill it (possible? with instrumentation via Esprima : for, while, do) (but how to keep the source line matched up? sounds hard...)
// / share button
// / instructions/documentation/tooltips/popovers
// - comments
// - home page
// / fix the get/set pixel/color APIs for numbers/strings
// - ask if they want to save when quitting the editor if changes are unsaved
// - fix the docs
//
// / work out how to run it from [azure|aws|digitalocean] on Debian with:
//      + mod_wsgi for REST api
//      + apache for static files
//      - database on another machine
//      + http://256pixels.net
//      - compressed assets (editor require() stuff and glyphicons not working)
// - telemetry/analytics
//
// - comments
//
// - player
//      - get it out of an iframe
//      - edit settings directly in the player (name, instructions, framerate) - no modal
//      - get rid of run button in editor pane (play button in the player)
//      - share button in preview frame
//
// - editor
//      - fix location/url when it's /edit/new and they've saved/created it (should be /edit/game_id)
//      - only save settings when they hit the save button! and get rid of /api/settings
//      - allow editing settings directly in the player (including name) (get rid of settings dialog)
//      - get rid of toolbar altogether (options button overlays the editor in top right)
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
//      - game list scrolling broken
//
// - api
//      key() instead of pressed() - with N key buffer ( and keyreleased() )
//
//////////////////////////////////////////////////////////////////////
// \ forking
// \ make minify.py handle multiple SCRIPT/STYLEBLOCKs
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
