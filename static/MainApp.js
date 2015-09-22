//////////////////////////////////////////////////////////////////////

var mainApp = angular.module('mainApp', ['ngRoute', 'ngAnimate', 'ui.bootstrap']);

//////////////////////////////////////////////////////////////////////
// - tetris
// - standalone player
// - share button
// - register 256pixels.net
// - make it 16 coloursSpace Invaders
// - voting/rating/comments
// - telemetry/analytics
// - ask if they want to save when quitting the editor if changes are unsaved
//
// - game list
//      ? Make a game private/public
//      paging in game list
//      make the search text work (timeout on change)
//      quick search buttons: my games, top games, most played, recently added, recently changed
//      track status of 'row expanded' by game_id and persist it
//
// - user registration/login/forgot password
//      user profile modal dialog to change username\email\password
//      bcrypt password on client before transmission
//      permission bits
//      proper session security
//
//////////////////////////////////////////////////////////////////////
// \ forking
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
// +    refresh game list on logout
// + get rid of the titlebar
// + edit by game ID rather than game name, so changing the name renames the existing game rather than creating a new one
// + editor view/edit mode with forking etc [but no forking, user can copy/paste for now]
// + save user options [editor,...?] in the database and as cookies [just saved in localStorage for now]
// + differentiate between my games and others
// + make it 16x16
