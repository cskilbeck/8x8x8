#----------------------------------------------------------------------
# TODO (chs): screenshots!
# TODO (chs): proper login/session thing
# TODO (chs): bcrypt password
# TODO (chs): parameter validation: min, max, minlength, maxlength, prepend, append, replace, enums?
# TODO (chs): autogenerate REST docs from parameter check dictionaries
# TODO (chs): make delete undoable for N days
# TODO (chs): make it unicode
#
# DONE (chs): parameter validation and conditioning engine
# DONE (chs): DRY the REST functions
#----------------------------------------------------------------------

import sys
import types
import web
from contextlib import closing
import MySQLdb as mdb
import MySQLdb.cursors
import pprint
import bcrypt
import datetime
import inspect
import json
import iso8601
import unicodedata
import struct
import os
import time
import png
import StringIO

#----------------------------------------------------------------------
# globals

app = None
render = web.template.render('templates/')

urls = (
    '/api/login', 'login',                      # user logging in
    '/api/register', 'register',                # user registration
    '/api/refreshSession', 'refreshSession',    # refresh a user session
    '/api/endSession', 'endSession',            # log out

    '/api/create', 'create',                    # C creating a new game
    '/api/source', 'source',                    # R get source, name, instructions of a game
    '/api/details', 'details',                  # R get details of a game (name, instructions, screenshot)
    '/api/count', 'count',                      # R search for # of games matching a search term
    '/api/list', 'list',                        # R get paginated list of games
    '/api/save', 'save',                        # U saving a game (name and source code)
    '/api/rename', 'rename',                    # U renaming a game (name)
    '/api/settings', 'settings',                # U update settings for a game
    '/api/screenshot', 'screenshot',            # U upload screenshot of a game
    '/api/delete', 'delete',                    # D delete a game

    '/favicon.ico', 'favicon',                  # get the favicon
    '/play/(.*)', 'play',                       # get details for play page
    '/screen/(.*)', 'screen',                   # get screenshot
    '/(.*)', 'index'                            # serve up a templated page
    )

#----------------------------------------------------------------------

#debug = False
debug = True

def show(x, m = 'var'):
     if debug:
        print m + ": " + pprint.pformat(x)

#----------------------------------------------------------------------
# JSON printer with date support

def date_handler(obj):
    return obj.isoformat() if hasattr(obj, 'isoformat') else obj

def JSON(x):
    return json.dumps(x, indent = 4, separators=(',',': '), default = date_handler)

def getJSON(x):
    if debug:
        time.sleep(0.5)  # simulate slow, remote server
    web.header('Content-type', 'application/json')
    return JSON(x)

#----------------------------------------------------------------------
# get a 32 bit random number which is not 0

def getRandomInt():
    while True:
        i = struct.unpack("<L", os.urandom(4))[0]
        if i != 0:
            return i

#----------------------------------------------------------------------
# persistent session in debug mode

def session():
    global app
    if web.config.get('_session') is None:
        s = web.session.Session(app, web.session.DiskStore('sessions'), { 'count': 0 })
        web.config._session = s
    else:
        s = web.config._session
    return s

#----------------------------------------------------------------------
# open the database

def opendb():
    conn = mdb.connect( host        = 'localhost',
                        user        = 'chs',
                        passwd      = 'henry1',
                        db          = 'G8',
                        use_unicode = True,
                        cursorclass = MySQLdb.cursors.DictCursor,
                        charset     = 'utf8')
    conn.autocommit(True)
    return conn

#----------------------------------------------------------------------

class RequestHandler:
    def mainHandler(self, handler):
        try:
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    return getJSON(handler(db, cur, data = web.input()))

        except ValueError, e:
            pprint.pprint(e)
            raise web.HTTPError('404 ' + str(e))

        except KeyError, e:
            pprint.pprint(e)
            raise web.HTTPError('404 ' + str(e))

        except mdb.Error, e:
            pprint.pprint(e)
            raise web.HTTPError('500 Database problem')

        except web.HTTPError, e:
            raise

        except Exception, e:
            pprint.pprint(e)
            raise web.HTTPError('500 Unknown error')

class Post(RequestHandler):
    def POST(self):
        try:
            return self.mainHandler(self.handlePost)
        except KeyError:
            raise web.HTTPError('405 Invalid Method')

class Get(RequestHandler):
    def GET(self):
        try:
            return self.mainHandler(self.handleGet)
        except KeyError:
            raise web.HTTPError('405 Invalid Method')

class Delete(RequestHandler):
    def DELETE(self):
        try:
            return self.mainHandler(self.handleDelete)
        except KeyError:
            raise web.HTTPError('405 Invalid Method')

#----------------------------------------------------------------------

def checked(paramspec, validateSession = False):

    def wrapper(func):

        def new_fun(self, db, cur, **kwargs):

            result = {}
            data = kwargs.get('data', {})

            for name in paramspec:
                default = paramspec[name]
                deftype = type(default)
                val = data.get(name, None)
                if val is not None:
                    val = unicodedata.normalize('NFKD', val).encode('ascii','ignore')
                if deftype == type:
                    if val is None:
                        raise ValueError('Missing parameter %s' % (name,))
                    try:
                        val = default(val)
                    except TypeError:
                        raise ValueError('%s cannot be cast to %s' % (name, default.__name__))
                elif deftype == dict:
                    defval = default.get('default', None)
                    deftype = default.get('type', None)
                    if deftype is None:
                        if defval is None:
                            raise ValueError('Invalid paramspec')
                        deftype = type(defval)
                    val = deftype(defval) if val is None else deftype(val)
                elif deftype in [int, float, str]:
                    val = default if val is None else deftype(val)
                elif deftype == datetime.datetime:
                    val = default if val is None else iso8601.parse_date(val)
                if val is None:
                    raise KeyError('Parameter %s is missing (expected: %s)' % (name, default.__name__))
                else:
                    result[name] = val

            if validateSession:
                if not ('user_id' in result and 'user_session' in result):
                    raise ValueError('Invalid paramspec - user_id & user_session must be present if validateSession is True')

                cur.execute('SELECT COUNT(*) AS count FROM users AS count WHERE user_id = %(user_id)s AND user_session = %(user_session)s', data)
                if cur.fetchone()['count'] != 1:
                    raise web.HTTPError('401 Invalid user session')

            return func(self, db, cur, data = result)
        return new_fun
    return wrapper

#----------------------------------------------------------------------
# make a search term SQLish

def searchTerm(s):
    return '%' + s.replace('*', '%').replace('.', '_') + '%'

#----------------------------------------------------------------------
# /api/list

class list(Get):
    @checked({
        'user_id': int,
        'search': '',
        'length': { 'default': 20, 'type': int, 'max': 100, 'min': 1 },
        'offset': { 'default': 0, 'min': 0 }
        })
    def handleGet(self, db, cur, data):
        data['search'] = searchTerm(data['search'])
        cur.execute('''SELECT game_id, games.user_id, game_title, game_lastsaved, game_created, user_username
                        FROM games INNER JOIN users ON users.user_id = games.user_id
                        WHERE (%(user_id)s < 0 OR games.user_id = %(user_id)s)
                            AND game_title LIKE %(search)s
                        ORDER BY game_lastsaved DESC, game_created DESC
                        LIMIT %(length)s OFFSET %(offset)s'''
                    , data)
        return { 'count': cur.rowcount, 'games': cur.fetchall() }

#----------------------------------------------------------------------
# /api/count

class count(Get):
    @checked({
        'user_id': int,
        'search': ''
        })
    def handleGet(self, db, cur, data):
        data['search'] = searchTerm(data['search'])
        cur.execute('''SELECT COUNT(*) AS count
                        FROM games
                        WHERE (%(user_id)s < 0 OR games.user_id = %(user_id)s)
                            AND game_title LIKE %(search)s''', data)
        return cur.fetchone()

#----------------------------------------------------------------------
# /api/source

class source(Get):
    @checked({ 'game_id': int })
    def handleGet(self, db, cur, data):
        cur.execute('SELECT game_source, game_title, game_instructions FROM GAMES WHERE game_id=%(game_id)s', data)
        if cur.rowcount == 1:
            return cur.fetchone()
        raise web.HTTPError('404 Game not found')

#----------------------------------------------------------------------
# /api/gameid

class gameid(Get):
    @checked({
        'user_id': int,
        'name': str
        })
    def handleGet(self, db, cur, data):
        cur.execute('''SELECT game_id FROM games WHERE game_title = %(name)s AND user_id = %(user_id)s''', data)
        if cur.rowcount != 1:
            raise web.HTTPError('404 Game not found')
        return cur.fetchone()

#----------------------------------------------------------------------
# /api/create

class create(Post):
    @checked({
        'user_id': int,
        'user_session': int,
        'name': str,
        'source': str
        }, True)
    def handlePost(self, db, cur, data):
        cur.execute('''SELECT game_id FROM games
                        WHERE game_title = %(name)s AND user_id = %(user_id)s''', data)
        if cur.rowcount != 0:
            raise web.HTTPError('401 Game name already exists')
        cur.execute('''INSERT INTO games (user_id, game_created, game_lastsaved, game_source, game_title)
                        VALUES (%(user_id)s, NOW(), NOW(), %(source)s, %(name)s)''' , data)
        return { 'created': cur.rowcount, 'game_id': cur.lastrowid }

#----------------------------------------------------------------------
# /api/settings

class settings(Post):
    @checked({
        'user_id': int,
        'user_session': int,
        'game_id': int,
        'framerate': 0,
        'instructions': ''
        }, True)
    def handlePost(self, db, cur, data):
        cur.execute('''UPDATE games SET game_framerate = %(framerate)s, game_instructions = %(instructions)s
                        WHERE game_id = %(game_id)s AND user_id = %(user_id)s''', data)
        return {'settings_saved': cur.rowcount }

#----------------------------------------------------------------------
# /api/rename

class rename(Post):
    @checked({
        'user_id': int,
        'user_session': int,
        'game_id': int,
        'name': str
        }, True)
    def handlePost(self, db, cur, data):
        cur.execute('''UPDATE games SET game_lastsaved = NOW(), game_title = %(name)s
                        WHERE game_id = %(game_id)s AND user_id = %(user_id)s''' , data)
        return { 'renamed': cur.rowcount }

#----------------------------------------------------------------------
# /api/save
# DONE (chs): require session to save game

class save(Post):
    @checked({
        'user_id': int,
        'user_session': int,
        'game_id': int,
        'source': str,
        'name': str
        }, True)
    def handlePost(self, db, cur, data):
        cur.execute('''UPDATE games SET game_lastsaved = NOW(), game_source = %(source)s, game_title = %(name)s
                        WHERE game_id = %(game_id)s AND user_id = %(user_id)s''' , data)
        return { 'saved': cur.rowcount }

#----------------------------------------------------------------------
# /api/screenshot

class screenshot(Post):
    @checked({
        'user_id': int,
        'user_session': int,
        'screen': str,
        'game_id': int
        }, True)
    def handlePost(self, db, cur, data):
        cur.execute('''UPDATE games SET game_screenshot = UNHEX(%(screen)s)
                        WHERE game_id = %(game_id)s AND user_id = %(user_id)s''', data)
        return {'posted': cur.rowcount }

#----------------------------------------------------------------------
# /api/delete

# TODO (chs): check user_session!

class delete(Post):
    @checked({
        'user_id': int,
        'user_session': int,
        'game_id': int
        }, True)
    def handlePost(self, db, cur, data):
        cur.execute('''DELETE FROM games
                        WHERE game_id = %(game_id)s AND user_id = %(user_id)s''', data)
        if cur.rowcount == 0:
            raise web.HTTPError('404 Game not found')
        return { 'deleted': cur.rowcount }

#----------------------------------------------------------------------
# /api/register

class register(Post):
    @checked({
        'email': str,
        'password': str,
        'username': str
        })
    def handlePost(self, db, cur, data):
        result = {}
        cur.execute('SELECT COUNT(*) AS count FROM users WHERE user_email=%(email)s', data)
        if cur.fetchone()['count'] != 0:
            raise web.HTTPError('401 Email already taken')
        else:
            cur.execute('SELECT COUNT(*) AS count FROM users WHERE user_username=%(username)s', data)
            if cur.fetchone()['count'] != 0:
                raise web.HTTPError('401 Username already taken')
            else:
                data['session'] = getRandomInt()
                cur.execute('''INSERT INTO users (user_email, user_password, user_username, user_created, user_session)
                                VALUES (%(email)s, %(password)s, %(username)s, NOW(), %(session)s)
                                ON DUPLICATE KEY UPDATE user_session = %(session)s, user_id = LAST_INSERT_ID(user_id)''', data)
                if cur.rowcount == 1 or cur.rowcount == 2:
                    user_id = cur.lastrowid
                    cur.execute('SELECT user_session FROM users WHERE user_email = %(email)s', data)
                    if cur.rowcount != 1:
                        raise web.HTTPError('500 Database error 37')
                    row = cur.fetchone()
                    result['user_id'] = user_id
                    result['user_username'] = data['username']
                    result['user_session'] = row['user_session']
                else:
                    raise web.HTTPError("401 Can't create account")
        return result

#----------------------------------------------------------------------
# /api/login

class login(Post):
    @checked({
        'email': str,
        'password': str
        })
    def handlePost(self, db, cur, data):
        result = {}
        data['session'] = getRandomInt()
        cur.execute('''UPDATE users SET user_session = %(session)s WHERE user_email = %(email)s AND user_password=%(password)s''', data)
        if cur.rowcount != 1:
            raise web.HTTPError('401 Incorrect email address or password')
        cur.execute('''SELECT user_id, user_username, user_session, user_email FROM users WHERE user_email = %(email)s''', data)
        if cur.rowcount != 1:
            raise web.HTTPError('500 Login error')
        row = cur.fetchone()
        return row

#----------------------------------------------------------------------
# /api/refreshSession

class refreshSession(Get):
    @checked({
        'user_id': int,
        'user_session': int,
        'user_username': str
        })
    def handleGet(self, db, cur, data):
        data['session'] = getRandomInt()
        cur.execute('''UPDATE users SET user_session = %(session)s WHERE user_id = %(user_id)s AND user_username = %(user_username)s AND user_session = %(user_session)s''', data)
        if cur.rowcount != 1:
            raise web.HTTPError('404 Session not found')
        data['user_session'] = data['session']
        return data;

#----------------------------------------------------------------------
# /api/endSession

class endSession(Get):
    @checked({
        'user_id': str,
        'user_session': str
        }, True)
    def handleGet(self, db, cur, data):
        cur.execute('''UPDATE users SET user_session = NULL WHERE user_id = %(user_id)s AND user_session = %(user_session)s''', data)
        if cur.rowcount != 1:
            raise web.HTTPError('401 Error terminating session')
        return { 'status': 'ok' }

#----------------------------------------------------------------------
# favicon.ico

class favicon:
    def GET(self):
        return open('static/favicon.ico', 'rb').read()

#----------------------------------------------------------------------
# /

class index:
    def GET(self, path):
        return open('static/html/index.html').read()

#----------------------------------------------------------------------
# getscreenshot

palette = [ (0x00,0x00,0x00),
            (0x00,0x80,0x00),
            (0x00,0xFF,0x00),
            (0x80,0xFF,0x80),
            (0x80,0x00,0x00),
            (0xFF,0x00,0x00),
            (0xFF,0x80,0x80),
            (0x00,0x00,0x80),
            (0x00,0x00,0xFF),
            (0x00,0xFF,0xFF),
            (0x80,0x00,0x80),
            (0xFF,0x00,0xF0),
            (0xFF,0x80,0xF0),
            (0xFF,0x80,0x00),
            (0xFF,0xFF,0x00),
            (0xFF,0xFF,0xFF) ]

def dim(pixel, scale = 0.75):
    return tuple([int(i * scale) for i in pixel])

def makeScreenShot(str):
    global palette
    row, rows = [], []
    for i in str:
        byte = ord(i)
        b1 = palette[(byte >> 4) & 0xf]
        b2 = palette[byte & 0xf]
        row.extend([b1, b1, b1, dim(b1), b2, b2, b2, dim(b2)])
        if len(row) == 64:
            rows.extend([row, row, row, [dim(pixel) for pixel in row]])
            row = []
    return png.from_array(rows, 'RGB')

class screen:
    def GET(self, gameid):
        try:
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    cur.execute('''SELECT game_screenshot FROM games WHERE game_id = %(gameid)s''', locals())
                    if cur.rowcount != 1:
                        raise web.HTTPError('404 game not found')
                    row = cur.fetchone()
                    buf = StringIO.StringIO()
                    makeScreenShot(row['game_screenshot']).save(buf)
                    web.header('Content-type', 'image/png')
                    return buf.getvalue()
        except Exception, e:
            pprint.pprint(e)
            raise

#----------------------------------------------------------------------
# play

class play:
    def GET(self, gameid):
        try:
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    cur.execute('''SELECT game_source, game_title FROM games WHERE game_id = %(gameid)s''', locals())
                    row = cur.fetchone()
                    return render.play(row['game_source'], row['game_title'])
        except Exception, e:
            pprint.pprint(e)
            raise web.HTTPError('404 Game not found')

#----------------------------------------------------------------------

if __name__ == '__main__':
    app = web.application(urls, globals())
    app.run()