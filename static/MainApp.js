//////////////////////////////////////////////////////////////////////
// - game list
//      Make a game private/public
//      differentiate between my games and others
//      forking
//      paging in game list
//      refresh game list on logout
//      make the search text work (timeout on change)
//      quick search buttons: my games, top games, most played, recently added, recently changed
// - user registration/login/forgot password
//      username, verify password etc
//      fix login/register promise resolve...
//      save user options [editor,...?] in the database and as cookies
// - voting/rating/comments
// - telemetry/analytics
// - editor view/edit mode with forking etc
// - ask if they want to save when quitting the editor if changes are unsaved
// - save editor options in user record
//
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
// +    Promise from login for what happens after (save, copy)
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

var mainApp = angular.module('mainApp', ['ngRoute', 'ngAnimate', 'ui.bootstrap']);

