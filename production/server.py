#----------------------------------------------------------------------
# TODO (chs): bcrypt password
# TODO (chs): autogenerate REST docs from parameter check dictionaries
# TODO (chs): make delete undoable for N days
# TODO (chs): make it unicode
#
# FINISH (chs): parameter validation: min, max, minlength, maxlength, prepend, append, replace, enums?
# FINISH (chs): proper login/session thing
#
# DONE (chs): parameter validation and conditioning engine
# DONE (chs): DRY the REST functions
# DONE (chs): screenshots!
#----------------------------------------------------------------------

import sys, types, os, time, datetime, struct
import web, pprint, json, iso8601, unicodedata
from contextlib import closing
import MySQLdb as mdb
import MySQLdb.cursors
# import bcrypt
import png, StringIO

#----------------------------------------------------------------------
# globals

app = None
render = web.template.render('templates/')

urls = (
    '/login', 'login',                      # user logging in
    '/register', 'register',                # user registration
    '/refreshSession', 'refreshSession',    # refresh a user session
    '/endSession', 'endSession',            # log out

    '/create', 'create',                    # C creating a new game
    '/source', 'source',                    # R get source, name, instructions of a game
    '/details', 'details',                  # R get details of a game (name, instructions, screenshot)
    '/count', 'count',                      # R search for # of games matching a search term
    '/list', 'list',                        # R get paginated list of games
    '/save', 'save',                        # U saving a game (name and source code)
    '/rename', 'rename',                    # U renaming a game (name)
    '/gameid', 'gameid',
    '/settings', 'settings',                # U update settings for a game
    '/screenshot', 'screenshot',            # U upload screenshot of a game
    '/delete', 'delete',                    # D delete a game

    '/favicon.ico', 'favicon',              # get the favicon
    '/play/(.*)', 'play',                   # get details for play page
    '/screen/(.*)', 'screen',               # get screenshot
    '/(.*)', 'index'                        # serve up a templated page
    )

#----------------------------------------------------------------------

debug = False
#debug = True

def show(x, m = 'var'):
     if debug:
        print m + ": " + pprint.pformat(x)

#----------------------------------------------------------------------
# JSON printer with date support

def date_handler(obj):
    return obj.isoformat() if hasattr(obj, 'isoformat') else obj

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

class Handler:

    def output(self, output):
        return output

    def mainHandler(self, handler, *args):

        if not handler in self.__class__.__dict__:
            raise web.HTTPError('401 Invalid method (%s not supported)' % (handler.upper(),))

        handlerFunc = self.__class__.__dict__[handler]

        if not callable(handlerFunc):
            raise web.HTTPError('401 Invalid method (%s not supported)' % (handler.upper(),))

        try:
            with closing(opendb()) as self.db:
                with closing(self.db.cursor()) as self.cur:
                    self.input = web.input()
                    output = self.output(handlerFunc(self, *args))
                    return output

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
            raise e

        except Exception, e:
            pprint.pprint(e)
            raise web.HTTPError('500 Unknown error')

    def POST(self, *args):
        return self.mainHandler("Post", *args)

    def GET(self, *args):
        return self.mainHandler("Get", *args)

    def DELETE(self, *args):
        return self.mainHandler("Delete", *args)

    def PUT(self, *args):
        return self.mainHandler("Put", *args)

#----------------------------------------------------------------------

def JSON(x):
    web.header('Content-type', 'application/json')
    return json.dumps(x, indent = 4, separators=(',',': '), default = date_handler)

def PNG(x):
    web.header('Content-type', 'image/png')
    return x

def HTML(x):
    web.header('Content-type', 'text/html')
    return x

def ICON(x):
    web.header('Content-type', 'image/x-icon')
    return x

#----------------------------------------------------------------------
# check parameter types and values in the web.input

class data(object):

    def __init__(self, paramSpec, validateSession = False):
        self.paramSpec = paramSpec
        self.validateSession = validateSession

    def __call__(self, original_func):
        def new_function(slf, *args, **kwargs):
            result = {}
            data = slf.input

            if self.validateSession:
                self.paramSpec['user_id'] = int
                self.paramSpec['user_session'] = int

            for name in self.paramSpec:
                default = self.paramSpec[name]
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
                            raise ValueError('Invalid paramSpec')
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

            if self.validateSession:
                slf.cur.execute('SELECT COUNT(*) AS count FROM users WHERE user_id = %(user_id)s AND user_session = %(user_session)s', result)
                if slf.cur.fetchone()['count'] != 1:
                    raise web.HTTPError('401 Invalid user session')

            slf.input = result
            return original_func(slf, *args, **kwargs)

        return new_function

#----------------------------------------------------------------------
# make a search term SQLish

def searchTerm(s):
    return '%' + s.replace('*', '%').replace('.', '_') + '%'

#----------------------------------------------------------------------
# /api/list

class list(Handler):
    @data({
        'user_id': int,
        'search': '',
        'length': { 'default': 20, 'type': int, 'max': 100, 'min': 1 },
        'offset': { 'default': 0, 'min': 0 }
        })
    def Get(self):
        self.input['search'] = searchTerm(self.input['search'])
        self.cur.execute('''SELECT game_id, games.user_id, game_title, game_lastsaved, game_created, user_username
                        FROM games INNER JOIN users ON users.user_id = games.user_id
                        WHERE (%(user_id)s < 0 OR games.user_id = %(user_id)s)
                            AND game_title LIKE %(search)s
                        ORDER BY game_lastsaved DESC, game_created DESC
                        LIMIT %(length)s OFFSET %(offset)s'''
                    , self.input)
        return JSON({ 'count': self.cur.rowcount, 'games': self.cur.fetchall() })

#----------------------------------------------------------------------
# /api/count

class count(Handler):
    @data({
        'user_id': int,
        'search': ''
        })
    def Get(self):
        self.input['search'] = searchTerm(self.input['search'])
        self.cur.execute('''SELECT COUNT(*) AS count
                        FROM games
                        WHERE (%(user_id)s < 0 OR games.user_id = %(user_id)s)
                            AND game_title LIKE %(search)s''', self.input)
        return JSON(self.cur.fetchone())

#----------------------------------------------------------------------
# /api/source

class source(Handler):
    @data({ 'game_id': int })
    def Get(self):
        self.cur.execute('SELECT game_source, game_title, game_instructions FROM games WHERE game_id=%(game_id)s', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('404 Game not found')
        return JSON(self.cur.fetchone())

#----------------------------------------------------------------------
# /api/gameid

class gameid(Handler):
    @data({
        'user_id': int,
        'name': str
        })
    def Get(self):
        self.cur.execute('''SELECT game_id FROM games WHERE game_title = %(name)s AND user_id = %(user_id)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('404 Game not found')
        return JSON(self.cur.fetchone())

#----------------------------------------------------------------------
# /api/create

class create(Handler):
    @data({
        'name': str,
        'source': str
        }, True)
    def Post(self):
        self.cur.execute('''SELECT game_id FROM games
                        WHERE game_title = %(name)s AND user_id = %(user_id)s''', self.input)
        if self.cur.rowcount != 0:
            raise web.HTTPError('401 Game name already exists')
        self.cur.execute('''INSERT INTO games (user_id, game_created, game_lastsaved, game_source, game_title)
                        VALUES (%(user_id)s, NOW(), NOW(), %(source)s, %(name)s)''' , self.input)
        return JSON({ 'created': self.cur.rowcount, 'game_id': self.cur.lastrowid })

#----------------------------------------------------------------------
# /api/settings

class settings(Handler):
    @data({
        'game_id': int,
        'framerate': 0,
        'instructions': ''
        }, True)
    def Post(self):
        self.cur.execute('''UPDATE games SET game_framerate = %(framerate)s, game_instructions = %(instructions)s
                        WHERE game_id = %(game_id)s AND user_id = %(user_id)s''', self.input)
        return JSON({'settings_saved': self.cur.rowcount })

#----------------------------------------------------------------------
# /api/rename

class rename(Handler):
    @data({
        'game_id': int,
        'name': str
        }, True)
    def Post(self):
        self.cur.execute('''UPDATE games SET game_lastsaved = NOW(), game_title = %(name)s
                        WHERE game_id = %(game_id)s AND user_id = %(user_id)s''' , self.input)
        return JSON({ 'renamed': self.cur.rowcount })

#----------------------------------------------------------------------
# /api/save
# DONE (chs): require session to save game

class save(Handler):
    @data({
        'game_id': int,
        'source': str,
        'name': str
        }, True)
    def Post(self):
        self.cur.execute('''UPDATE games SET game_lastsaved = NOW(), game_source = %(source)s, game_title = %(name)s
                        WHERE game_id = %(game_id)s AND user_id = %(user_id)s''', self.input)
        return JSON({ 'saved': self.cur.rowcount })

#----------------------------------------------------------------------
# /api/screenshot

class screenshot(Handler):
    @data({
        'screen': str,
        'game_id': int
        }, True)
    def Post(self):
        self.cur.execute('''UPDATE games SET game_screenshot = UNHEX(%(screen)s)
                        WHERE game_id = %(game_id)s AND user_id = %(user_id)s''', self.input)
        return JSON({'posted': self.cur.rowcount })

#----------------------------------------------------------------------
# /api/delete

# TODO (chs): check user_session!
# TODO (chs): make it a DELETE operation

class delete(Handler):
    @data({
        'game_id': int
        }, True)
    def Post(self):
        self.cur.execute('''DELETE FROM games
                        WHERE game_id = %(game_id)s AND user_id = %(user_id)s''', self.input)
        if self.cur.rowcount == 0:
            raise web.HTTPError('404 Game not found')
        return JSON({ 'deleted': self.cur.rowcount })

#----------------------------------------------------------------------
# /api/register

class register(Handler):
    @data({
        'email': str,
        'password': str,
        'username': str
        })
    def Post(self):
        result = {}
        self.cur.execute('SELECT COUNT(*) AS count FROM users WHERE user_email=%(email)s', self.input)
        if self.cur.fetchone()['count'] != 0:
            raise web.HTTPError('401 Email already taken')
        else:
            self.cur.execute('SELECT COUNT(*) AS count FROM users WHERE user_username=%(username)s', self.input)
            if self.cur.fetchone()['count'] != 0:
                raise web.HTTPError('401 Username already taken')
            else:
                data['session'] = getRandomInt()
                self.cur.execute('''INSERT INTO users (user_email, user_password, user_username, user_created, user_session)
                                VALUES (%(email)s, %(password)s, %(username)s, NOW(), %(session)s)
                                ON DUPLICATE KEY UPDATE user_session = %(session)s, user_id = LAST_INSERT_ID(user_id)''', self.input)
                if self.cur.rowcount == 1 or self.cur.rowcount == 2:
                    user_id = self.cur.lastrowid
                    self.cur.execute('SELECT user_session FROM users WHERE user_email = %(email)s', self.input)
                    if self.cur.rowcount != 1:
                        raise web.HTTPError('500 Database error 37')
                    row = self.cur.fetchone()
                    result['user_id'] = user_id
                    result['user_username'] = data['username']
                    result['user_session'] = row['user_session']
                else:
                    raise web.HTTPError("401 Can't create account")
        return JSON(result)

#----------------------------------------------------------------------
# /api/login

class login(Handler):
    @data({
        'email': str,
        'password': str
        })
    def Post(self):
        result = {}
        self.input['session'] = getRandomInt()
        self.cur.execute('''UPDATE users SET user_session = %(session)s WHERE user_email = %(email)s AND user_password=%(password)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('401 Incorrect email address or password')
        self.cur.execute('''SELECT user_id, user_username, user_session, user_email FROM users WHERE user_email = %(email)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('500 Login error')
        row = self.cur.fetchone()
        return JSON(row)

#----------------------------------------------------------------------
# /api/refreshSession

class refreshSession(Handler):
    @data({
        'user_id': int,
        'user_session': int,
        'user_username': str
        })
    def Get(self):
        self.input['session'] = getRandomInt()
        self.cur.execute('''UPDATE users SET user_session = %(session)s WHERE user_id = %(user_id)s AND user_username = %(user_username)s AND user_session = %(user_session)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('404 Session not found')
        self.input['user_session'] = self.input['session']
        return JSON(self.input)

#----------------------------------------------------------------------
# /api/endSession

class endSession(Handler):
    @data({}, True)
    def Get(self):
        self.cur.execute('''UPDATE users SET user_session = NULL WHERE user_id = %(user_id)s AND user_session = %(user_session)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('401 Error terminating session')
        return JSON({ 'status': 'ok' })

#----------------------------------------------------------------------
# favicon.ico

class favicon:
    def GET(self):
        return ICON(open('static/favicon.ico', 'rb').read())

#----------------------------------------------------------------------
# /

class index:
    def GET(self, path):
        print "HTML!!"
        return HTML(open('index.html').read())

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

class screen(Handler):
    def Get(self, game_id):
        self.cur.execute('''SELECT game_screenshot FROM games WHERE game_id = %(game_id)s''', locals())
        if self.cur.rowcount != 1:
            raise web.HTTPError('404 game not found')
        row = self.cur.fetchone()
        if row['game_screenshot'] is None:
            return PNG(open('static/img/brand.png', 'rb').read())
        buf = StringIO.StringIO()
        makeScreenShot(row['game_screenshot']).save(buf)
        return PNG(buf.getvalue())

#----------------------------------------------------------------------
# play

class play(Handler):
    def Get(self, game_id):
        self.cur.execute('''SELECT game_source, game_title, game_instructions FROM games WHERE game_id = %(game_id)s''', locals())
        if self.cur.rowcount == 0:
            raise web.HTTPError('404 Game not found')
        row = self.cur.fetchone()
        return HTML(render.play(row['game_source'], row['game_title'], row['game_instructions']))

#----------------------------------------------------------------------

app = web.application(urls, globals())

if __name__ == '__main__':
    app.run()
else:
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../public_html/'))
    print os.getcwd()
    application = app.wsgifunc()
