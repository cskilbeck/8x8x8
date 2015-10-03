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

import sys, types, os, time, datetime, struct, re, random
import web, pprint, json, iso8601, unicodedata, urlparse
from contextlib import closing
import MySQLdb as mdb
import MySQLdb.cursors
# import bcrypt
import png, StringIO
from PIL import Image, ImageDraw

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
    '/rating', 'rating',                    # R get what rating a user gave a game
    '/save', 'save',                        # U saving a game (name and source code)
    '/rate', 'rate',                        # U set a rating per user
    '/rename', 'rename',                    # U renaming a game (name)
    '/gameid', 'gameid',
    '/settings', 'settings',                # U update settings for a game
    '/screenshot', 'screenshot',            # U upload screenshot of a game
    '/delete', 'delete',                    # D delete a game
    '/play/(.*)', 'play',                   # get details for play page
    '/screen/(.*)', 'screen',               # get screenshot
    '/favicon.ico', 'favicon',              # get the favicon
    '/(.*)', 'index'                        # serve up a templated page
    )

#----------------------------------------------------------------------

debug = False
#debug = True

def show(x, m = 'var'):
     if debug:
        print m + ": " + pprint.pformat(x)

#----------------------------------------------------------------------

nameregex = re.compile('[^0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!\? \n\.\,''\"\:\;\$\*\(\)\-\+\=\_\[\]\{\}`\@\#\%\^\&\/]')

def stripName(x, len):
    global nameregex
    return re.sub(nameregex, '', x)[:len]

#----------------------------------------------------------------------
# JSON printer with date support

def correct_date(d):
    d -= (datetime.datetime.now() - datetime.datetime.utcnow())
    return d

def date_handler(obj):
    if hasattr(obj, 'isoformat'):
        delta = datetime.datetime.now() - datetime.datetime.utcnow()
        hh,mm = divmod((delta.days * 24*60*60 + delta.seconds + 30) // 60, 60)
        return "%s%+03d%02d" % (obj.isoformat(), hh, mm)
    else:
        return obj;

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

        print handler + " for " + web.ctx.path

        # TODO (chs): fix this and make it work with cloudflare
        web.header('Access-Control-Allow-Origin', '*')

        if not handler in self.__class__.__dict__:
            raise web.HTTPError('401 Invalid method (%s not supported)' % (handler.upper(),))

        handlerFunc = self.__class__.__dict__[handler]

        if not callable(handlerFunc):
            raise web.HTTPError('401 Invalid method (%s not supported)' % (handler.upper(),))

        try:
            with closing(opendb()) as self.db:
                with closing(self.db.cursor()) as self.cur:
                    self.input = web.input()
                    self.data = web.data()
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

    def __init__(self, paramSpec):
        self.paramSpec = paramSpec

    def __call__(self, original_func):
        def new_function(slf, *args, **kwargs):
            result = {}

            method = web.ctx.method
            if method in ['GET', 'DELETE']: # TODO (chs): work out which should use URL and which should use Request Data
                data = web.input()
            elif method in ['POST', 'PUT']:
                contentType = web.ctx.env.get('CONTENT_TYPE').split(';')
                if len(contentType) > 0:
                    if contentType[0] == 'application/json':
                        data = json.loads(web.data())
                    elif contentType[0] == 'application/x-www-form-urlencoded':
                        data = urlparse.parse_qs(web.data())
                        # now it will be strings...
                    # TODO (chs): add more content-type handlers (I thought web.input was supposed to )
                    # TODO (chs): handle UNICODE?

            # print "ENV:", pprint.pformat(web.ctx.environ)

            params = self.paramSpec.get('params', {})

            validate = False
            if self.paramSpec.get('validate', False):
                validate = True
                params['user_id'] = int
                params['user_session'] = int

            for name in params:
                default = params[name]
                deftype = type(default)
                val = data.get(name, None)
                # if val is str:
                #     val = unicodedata.normalize('NFKD', val).encode('ascii','ignore')
                if deftype == type:
                    if val is None:
                        raise web.HTTPError('401 Missing parameter %s' % (name,))
                    try:
                        val = default(val)  # chs: handle unicode?
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

                    minval = default.get('min', None)   # for int, float: min value, for str, min length
                    if minval is not None:
                        if deftype in [int, float]:
                            val = max(minval, val)
                        elif deftype == str:
                            pass # min for str is not really useful (what should it be padding with?)

                    maxval = default.get('max', None)   # same a minval but max
                    if maxval is not None:
                        if deftype in [int, float]:
                            val = min(maxval, val)
                        elif deftype == str:
                            val = val[:maxval]
                elif deftype in [int, float, str, unicode]:
                    val = default if val is None else deftype(val)
                elif deftype == datetime.datetime:
                    val = default if val is None else iso8601.parse_date(val)

                if val is None:
                    raise KeyError('Parameter %s is missing (expected: %s)' % (name, default.__name__))
                else:
                    result[name] = val

            if validate:
                slf.cur.execute('''SELECT COUNT(*) AS count
                                    FROM users
                                    WHERE user_id = %(user_id)s
                                        AND user_session = %(user_session)s''', result)
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

# rating_stars should be 0 for games where this user has not rated the game 

class list(Handler):
    @data({
        'params': {
            'user_id': 0,
            'game_id': 0,
            'justmygames': 0,
            'search': '',
            'length': { 'default': 20, 'type': int, 'max': 100, 'min': 1 },
            'offset': { 'default': 0, 'min': 0 }
            }
        })
    def Get(self):
        self.input['search'] = searchTerm(self.input['search'])
        self.cur.execute('''SELECT games.game_id, games.user_id, game_title, game_lastsaved, game_created, user_username, game_instructions, game_rating, rating_stars
                            FROM games
                                JOIN users ON users.user_id = games.user_id
                                LEFT JOIN (SELECT * FROM ratings WHERE user_id = %(user_id)s) AS myratings ON games.game_id = myratings.game_id
                            WHERE (%(justmygames)s = 0 OR games.user_id = %(user_id)s)
                                AND (%(game_id)s = 0 OR games.game_id = %(game_id)s)
                                AND (game_title LIKE %(search)s)
                            ORDER BY game_lastsaved DESC, game_created DESC
                            LIMIT %(length)s OFFSET %(offset)s'''
                    , self.input)
        rows = self.cur.fetchall()
        return JSON({ 'count': len(rows), 'games': rows })

#----------------------------------------------------------------------
# /api/count

class count(Handler):
    @data({
        'params': {
            'user_id': int,
            'search': ''
            }
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
    @data({
        'params': {
            'game_id': int
            }
        })
    def Get(self):
        self.cur.execute('''SELECT game_id, users.user_id, user_username, game_created, game_lastsaved, game_title, game_instructions, game_framerate, game_source
                            FROM games
                                JOIN users ON users.user_id = games.user_id
                            WHERE game_id = %(game_id)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('404 Game not found')
        return JSON(self.cur.fetchone())

#----------------------------------------------------------------------
# /api/gameid

class gameid(Handler):
    @data({
        'params': {
            'user_id': int,
            'name': str
            }
        })
    def Get(self):
        self.cur.execute('''SELECT game_id
                            FROM games
                            WHERE game_title = %(name)s
                                AND user_id = %(user_id)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('404 Game not found')
        return JSON(self.cur.fetchone())

#----------------------------------------------------------------------
# /api/create

class create(Handler):
    @data({
        'validate': True,
        'params': {
            'game_title': str,
            'game_source': str,
            'game_instructions': '',
            'game_framerate': int
            }
        })
    def Post(self):
        self.cur.execute('''SELECT game_id
                            FROM games
                            WHERE game_title = %(game_title)s AND user_id = %(user_id)s''', self.input)
        if self.cur.rowcount != 0:
            raise web.HTTPError('409 Game name already exists')
        self.cur.execute('''INSERT INTO games (user_id, game_created, game_lastsaved, game_source, game_title, game_instructions, game_framerate)
                            VALUES (%(user_id)s, NOW(), NOW(), %(game_source)s, %(game_title)s, %(game_instructions)s, %(game_framerate)s)''' , self.input)
        return JSON({ 'created': self.cur.rowcount, 'game_id': self.cur.lastrowid })

#----------------------------------------------------------------------
# /api/settings

class settings(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int,
            'game_framerate': 0,
            'game_instructions': ''
            }
        })
    def Post(self):
        self.cur.execute('''UPDATE games SET game_framerate = %(game_framerate)s, game_instructions = %(game_instructions)s
                            WHERE game_id = %(game_id)s
                                AND user_id = %(user_id)s''', self.input)
        return JSON({'settings_saved': self.cur.rowcount })

#----------------------------------------------------------------------
# /api/rename

class rename(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int,
            'name': str
            }
        })
    def Post(self):
        self.cur.execute('''UPDATE games
                            SET game_lastsaved = NOW(), game_title = %(name)s
                            WHERE game_id = %(game_id)s
                                AND user_id = %(user_id)s''' , self.input)
        return JSON({ 'renamed': self.cur.rowcount })

#----------------------------------------------------------------------
# /api/rate

class rating(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int
            }
        })
    def Get(self):
        self.cur.execute('''SELECT rating_stars FROM ratings
                            WHERE user_id = %(user_id)s
                                AND game_id = %(game_id)s''', self.input)
        if self.cur.rowcount == 0:
            #raise web.HTTPError('404 user %(user_id)d has not rated game %(game_id)d' % self.input)
            return JSON({ 'rating_stars': 0 })  # meaning not yet rated by this user
        return JSON(self.cur.fetchone())

#----------------------------------------------------------------------
# /api/rate

class rate(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int,
            'rating': int
            }
        })
    def Post(self):
        self.cur.execute('''INSERT INTO ratings (rating_timestamp, game_id, user_id, rating_stars)
                            VALUES(NOW(), %(game_id)s, %(user_id)s, %(rating)s)
                            ON DUPLICATE KEY UPDATE rating_timestamp = NOW(), rating_stars = %(rating)s''', self.input)
        self.cur.execute('''UPDATE games 
                            SET game_rating =
                                (SELECT (SELECT SUM(rating_stars) FROM ratings WHERE game_id = %(game_id)s) / (SELECT COUNT(*) FROM ratings WHERE game_id = %(game_id)s))
                            WHERE game_id = %(game_id)s''', self.input)
        self.cur.execute('''SELECT game_rating
                            FROM games
                            WHERE game_id = %(game_id)s''', self.input)
        return JSON(self.cur.fetchone())

#----------------------------------------------------------------------
# /api/save
# DONE (chs): require session to save game

class save(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int,
            'game_title': str,
            'game_instructions': str,
            'game_framerate': int,
            'game_source': str
            }
        })
    def Post(self):
        self.input['game_instructions'] = stripName(self.input['game_instructions'], 240)
        self.input['game_title'] = stripName(self.input['game_title'], 32)
        self.cur.execute('''UPDATE games SET
                                game_lastsaved = NOW(),
                                game_title = %(game_title)s,
                                game_instructions = %(game_instructions)s,
                                game_framerate = %(game_framerate)s,
                                game_source = %(game_source)s
                            WHERE game_id = %(game_id)s
                                AND user_id = %(user_id)s''', self.input)
        return JSON({ 'saved': self.cur.rowcount })

#----------------------------------------------------------------------
# /api/screenshot

class screenshot(Handler):
    @data({
        'validate': True,
        'params': {
            'screen': str,
            'game_id': int
            }
        })
    def Post(self):
        self.cur.execute('''UPDATE games
                            SET game_screenshot = UNHEX(%(screen)s), game_lastsaved = NOW()
                            WHERE game_id = %(game_id)s
                                AND user_id = %(user_id)s''', self.input)
        return JSON({'posted': self.cur.rowcount })

#----------------------------------------------------------------------
# /api/delete

# TODO (chs): check user_session!
# TODO (chs): make it a DELETE operation

class delete(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int
            }
        })
    def Post(self):
        self.cur.execute('''DELETE FROM games
                            WHERE game_id = %(game_id)s
                                AND user_id = %(user_id)s''', self.input)
        if self.cur.rowcount == 0:
            raise web.HTTPError('404 Game not found')
        return JSON({ 'deleted': self.cur.rowcount })

#----------------------------------------------------------------------
# /api/register

class register(Handler):
    @data({
        'params': {
            'email': str,
            'password': str,
            'username': str
            }
        })
    def Post(self):
        result = {}
        self.cur.execute('''SELECT COUNT(*) AS count
                            FROM users
                            WHERE user_email=%(email)s''', self.input)
        if self.cur.fetchone()['count'] != 0:
            web.debug("TAKEN!")
            raise web.HTTPError('409 Email already taken')
        else:
            self.cur.execute('''SELECT COUNT(*) AS count FROM users
                                WHERE user_username=%(username)s''', self.input)
            if self.cur.fetchone()['count'] != 0:
                raise web.HTTPError('409 Username already taken')
            else:
                self.input['session'] = getRandomInt()
                self.cur.execute('''INSERT INTO users (user_email, user_password, user_username, user_created, user_session)
                                    VALUES (%(email)s, %(password)s, %(username)s, NOW(), %(session)s)
                                    ON DUPLICATE KEY UPDATE user_session = %(session)s, user_id = LAST_INSERT_ID(user_id)''', self.input)
                if self.cur.rowcount == 1 or self.cur.rowcount == 2:
                    user_id = self.cur.lastrowid
                    self.cur.execute('''SELECT user_session 
                                        FROM users
                                        WHERE user_email = %(email)s''', self.input)
                    if self.cur.rowcount != 1:
                        raise web.HTTPError('500 Database error 37')
                    row = self.cur.fetchone()
                    result['user_id'] = user_id
                    result['user_username'] = self.input['username']
                    result['user_session'] = row['user_session']
                else:
                    raise web.HTTPError("401 Can't create account")
        return JSON(result)

#----------------------------------------------------------------------
# /api/login

class login(Handler):
    @data({
        'params': {
            'email': str,
            'password': str
        }
    })
    def Post(self):
        result = {}
        self.input['session'] = getRandomInt()
        self.cur.execute('''UPDATE users
                            SET user_session = %(session)s
                            WHERE user_email = %(email)s
                                AND user_password=%(password)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('401 Incorrect email address or password')
        self.cur.execute('''SELECT user_id, user_username, user_session, user_email
                            FROM users
                            WHERE user_email = %(email)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('500 Login error')
        row = self.cur.fetchone()
        return JSON(row)

#----------------------------------------------------------------------
# /api/refreshSession

class refreshSession(Handler):
    @data({
        'params': {
            'user_id': int,
            'user_session': int,
            'user_username': str
        }
    })
    def Get(self):
        self.input['new_session'] = getRandomInt()
        self.cur.execute('''UPDATE users
                            SET user_session = %(new_session)s
                            WHERE user_id = %(user_id)s
                                AND user_username = %(user_username)s
                                AND user_session = %(user_session)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('404 Session not found')
        self.input['user_session'] = self.input['new_session']
        return JSON(self.input)

#----------------------------------------------------------------------
# /api/endSession

class endSession(Handler):
    @data({
        'validate': True,
    })
    def Get(self):
        self.cur.execute('''UPDATE users
                            SET user_session = NULL    
                            WHERE user_id = %(user_id)s
                                AND user_session = %(user_session)s''', self.input)
        if self.cur.rowcount != 1:
            raise web.HTTPError('401 Error terminating session')
        return JSON({ 'status': 'ok' })

#----------------------------------------------------------------------
# favicon.ico

class favicon:
    def GET(self):
        return ICON(open('favicon.ico', 'rb').read())

#----------------------------------------------------------------------
# /

class index:
    def GET(self, path):
        print web.ctx.path
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

def round_rectangle(size, radius, fill):
    width, height = size
    rectangle = Image.new('RGB', size, fill)
    corner = Image.new('RGB', (radius, radius), (0, 0, 0))
    draw = ImageDraw.Draw(corner)
    draw.pieslice((0, 0, radius * 2, radius * 2), 180, 270, fill=fill)
    rectangle.paste(corner, (0, 0))
    rectangle.paste(corner.rotate(90), (0, height - radius)) # Rotate the corner and paste it
    rectangle.paste(corner.rotate(180), (width - radius, height - radius))
    rectangle.paste(corner.rotate(270), (width - radius, 0))
    return rectangle

pixels = [round_rectangle((15, 15), 3, p) for p in palette]

def get_screenshot(screen):
    if screen is None:
        return defaultScreenshot
    s = Image.new('RGB', (256, 256), (0, 0, 0))
    x, y = 0, 0
    for i in screen:
        byte = ord(i)
        s.paste(pixels[(byte >> 4) & 0xf], (x +  1, y + 1))
        s.paste(pixels[(byte >> 0) & 0xf], (x + 17, y + 1))
        x += 32
        if x == 256:
            x = 0;
            y += 16
    buf = StringIO.StringIO()
    s = s.resize((64, 64), Image.ANTIALIAS)
    s.save(buf, 'PNG')
    return buf.getvalue()

defaultScreenshot = get_screenshot(os.urandom(128))

class screen(Handler):
    def Get(self, game_id):
        self.cur.execute('''SELECT game_screenshot, game_lastsaved FROM games
                            WHERE game_id = %(game_id)s''', locals())
        if self.cur.rowcount != 1:
            raise web.HTTPError('404 game not found')
        row = self.cur.fetchone()
        web.http.lastmodified(correct_date(row['game_lastsaved']))    # TODO (chs): keep separate last-modified values for screenshot and game save
        return PNG(get_screenshot(row['game_screenshot']))

#----------------------------------------------------------------------
# play

class play(Handler):
    def Get(self, game_id):
        self.cur.execute('''SELECT game_id, game_source, game_title, game_instructions, game_framerate
                            FROM games WHERE game_id = %(game_id)s''', locals())
        if self.cur.rowcount == 0:
            return HTML(render.nogame(game_id))
        return HTML(render.play(self.cur.fetchone()))

#----------------------------------------------------------------------

app = web.application(urls, globals())

if __name__ == '__main__':
    app.run()
else:
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../public_html/'))
    web.debug(os.getcwd())
    application = app.wsgifunc()
