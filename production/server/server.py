#----------------------------------------------------------------------
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
# DONE (chs): bcrypt password
#----------------------------------------------------------------------

print "====================================================\nServer restart\n====================================================\n\n"

import sys, types, os, time, datetime, struct, re, random
import web, pprint, json, iso8601, unicodedata, urlparse, urllib
import bcrypt
from contextlib import closing
from base64 import b64encode
import MySQLdb as mdb
import MySQLdb.cursors
import png, StringIO
from PIL import Image, ImageDraw
import dbase_nogit as DB
import sendemail

#----------------------------------------------------------------------
# globals

app = None
render = web.template.render('/usr/local/www/256pixels.net/public_html/templates/')

print "Using database at", DB.Vars.host

# pick up any changes in these modules
reload(DB)
reload(sendemail)

urls = (
    '/login', 'login',                      # user logging in
    '/register', 'register',                # user registration
    '/details', 'details',                  # user details update
    '/resetpw', 'resetpw',                  # reset password
    '/userdetails', 'userdetails',          # get user details to prepare for password reset
    '/refreshSession', 'refreshSession',    # refresh a user session
    '/endSession', 'endSession',            # log out
    '/create', 'create',                    # C creating a new game
    '/source', 'source',                    # R get source, name, instructions of a game
    '/details', 'details',                  # R get details of a game (name, instructions, screenshot)
    '/count', 'count',                      # R search for # of games matching a search term
    '/list', 'list',                        # R get paginated list of games
    '/gameid', 'gameid',                    # R get a gameid
    '/rating', 'rating',                    # R get what rating a user gave a game
    '/save', 'save',                        # U saving a game (name and source code)
    '/rate', 'rate',                        # U set a rating per user
    '/rename', 'rename',                    # U renaming a game (name)
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
    conn = mdb.connect( host        = DB.Vars.host,
                        user        = DB.Vars.user,
                        passwd      = DB.Vars.passwd,
                        db          = DB.Vars.db,
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

        if not handler in self.__class__.__dict__:
            raise web.HTTPError('401 Invalid method (%s not supported)' % (handler.upper(),))

        handlerFunc = self.__class__.__dict__[handler]

        if not callable(handlerFunc):
            raise web.HTTPError('401 Invalid method (%s not supported)' % (handler.upper(),))

        try:
            with closing(opendb()) as self.db:
                with closing(self.db.cursor()) as self.cur:
                    output = self.output(handlerFunc(self, *args))
                    return output if type(output) != dict else JSON(output)

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

    def execute(self, sql, dic):
        return self.cur.execute(sql, dic)

    def rowcount(self):
        return self.cur.rowcount

    def fetchone(self):
        return self.cur.fetchone()

    def fetchall(self):
        return self.cur.fetchall()

    def lastrowid(self):
        return self.cur.lastrowid

#----------------------------------------------------------------------

def JSON(x):
    web.header('Content-type', 'application/json')
    return json.dumps(x, separators = (',',':'), default = date_handler)

def PNG(x):
    web.header('Content-type', 'image/png')
    return x

def HTML(x):
    web.header('Content-type', 'text/html')
    return x

def ICON(x):
    web.header('Content-type', 'image/x-icon')
    return x

def BIN(x):
    web.header('Content-type', 'application/octet-stream')
    return x

def TEXT(x):
    web.header('Content-type', 'text/plain')
    return x

#----------------------------------------------------------------------
# class data - decorator to check parameter types and values in the web.input

class data(object):

    # some common rules
    email = { 'type': str, 'regex': r"^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$" }
    password = { 'type': str, 'min': 6, 'max': 64 }
    optionalpassword = { 'type': str, 'optional': True, 'min': 6, 'max': 64 }
    username = { 'type': str, 'min': 3, 'max': 32 }
    game_title = { 'type': str, 'min': 2, 'max': 32 }
    game_instructions = { 'default': '', 'min': 0, 'max': 240 }
    game_framerate = { 'default': 0, 'min': 0, 'max': 5 }
    game_rating = { 'type': int, 'min': 1, 'max': 5 }
    screenshot = { 'type': str, 'min': 256, 'max': 256 }
    resetcode = { 'type': str, 'regex': '[XYT34567H9AKCDEF]{6}' }
    optionalresetcode = { 'type': str, 'optional': True, 'regex': '[XYT34567H9AKCDEF]{6}' }

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
                        data = web.input()
                        # now it will be strings...
                    # TODO (chs): add more content-type handlers (I thought web.input was supposed to )
                    # TODO (chs): handle UNICODE?

            # print "ENV:", pprint.pformat(web.ctx.environ)
            # print "Data:", pprint.pformat(web.data())

            params = self.paramSpec.get('params', {})

            validate = False
            if self.paramSpec.get('validate', False):
                validate = True
                params['user_id'] = int
                params['user_session'] = int

            for name in params:
                param = params[name]
                optional = False
                deftype = type(param)
                val = data.get(name, None)
                # if val is str:
                #     val = unicodedata.normalize('NFKD', val).encode('ascii','ignore')
                if deftype == type:
                    if val is None:
                        raise web.HTTPError('401 Missing parameter %s' % (name,))
                    try:
                        val = param(val)  # chs: handle unicode?
                    except TypeError:
                        raise ValueError('%s cannot be cast to %s' % (name, param.__name__))

                elif deftype == dict:
                    optional = param.get('optional', False)
                    defval = param.get('default', None)
                    deftype = param.get('type', None)
                    if deftype is None:
                        if defval is None:
                            raise ValueError('Invalid paramSpec')
                        deftype = type(defval)
                    if not optional:
                        val = deftype(defval) if val is None else deftype(val)  # coerce to the right type (from string, usually)
                    elif val is not None:
                        val = deftype(val)

                    if val is not None:
                        minval = param.get('min', None)   # for int, float: min value, for str, min length
                        maxval = param.get('max', None)   # same as minval but max
                        regex = param.get('regex', None)

                        if regex is not None:
                            if deftype is not str:
                                raise ValueError('Invalid paramSpec - regex supplied but {0} is not a str'.format(name))
                            if re.match(regex, val) is None:
                                print val
                                raise web.HTTPError('401 value for {0} is not valid'.format(name))

                        if minval is not None:
                            if deftype in [int, float] and val < minval:
                                raise web.HTTPError('401 value for {0} is too low'.format(name))
                            elif deftype == str and len(val) < minval:
                                raise web.HTTPError('401 value for {0} is too short'.format(name))

                        if maxval is not None:
                            if deftype in [int, float] and val > maxval:
                                raise web.HTTPError('401 value for {0} is too high'.format(name))
                            elif deftype == str and len(val) > maxval:
                                raise web.HTTPError('401 value for {0} is too long'.format(name))

                elif deftype in [int, float, str, unicode]:
                    val = param if val is None else deftype(val)

                elif deftype == datetime.datetime:
                    val = param if val is None else iso8601.parse_date(val)

                if val is None and not optional:
                    raise KeyError('Required parameter %s is missing (expected: %s)' % (name, deftype.__name__))
                else:
                    result[name] = val

            if validate:
                slf.execute('''SELECT COUNT(*) AS count
                                FROM users
                                WHERE user_id = %(user_id)s
                                    AND user_session = %(user_session)s''', result)
                if slf.fetchone()['count'] != 1:
                    raise web.HTTPError('401 Invalid user session')

            return original_func(slf, result, *args, **kwargs)

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
            'justmygames': int,
            'search': { 'default': '', 'max': 32 },
            'length': { 'default': 5, 'max': 50, 'min': 1 },
            'offset': { 'default': 0, 'min': 0 }
            }
        })
    def Get(self, data):
        print pprint.pformat(data)
        result = {}
        data['search'] = searchTerm(data['search'])
        self.execute('''SELECT COUNT(*) AS count
                        FROM games
                        WHERE (%(justmygames)s = 0 OR games.user_id = %(user_id)s)
                            AND (%(game_id)s = 0 OR games.game_id = %(game_id)s)
                            AND game_title LIKE %(search)s''', data)
        result['total'] = self.fetchone()['count']
        print result['total']
        self.execute('''SELECT games.game_id,
                                games.user_id,
                                game_title,
                                game_lastsaved,
                                game_created,
                                user_username,
                                game_instructions,
                                game_rating,
                                rating_stars,
                                HEX(game_screenshot) AS screenshot
                        FROM games
                            LEFT JOIN users
                                ON users.user_id = games.user_id
                            LEFT JOIN (SELECT game_id, rating_stars
                                        FROM ratings
                                        WHERE user_id = %(user_id)s) AS myratings
                                ON games.game_id = myratings.game_id
                        WHERE (%(justmygames)s = 0 OR games.user_id = %(user_id)s)
                            AND (%(game_id)s = 0 OR games.game_id = %(game_id)s)
                            AND (game_title LIKE %(search)s)
                        ORDER BY game_lastsaved DESC, game_created DESC
                        LIMIT %(length)s OFFSET %(offset)s''', data)
        rows = self.fetchall()
        result['count'] = len(rows)
        result['games'] = rows;
        print pprint.pformat(result)
        return JSON(result)

#----------------------------------------------------------------------
# /api/count

class count(Handler):
    @data({
        'params': {
            'user_id': 0,
            'justmygames': 0,
            'search': { 'default': '', 'min': 0, 'max': 32 }
            }
        })
    def Get(self, data):
        data['search'] = searchTerm(data['search'])
        self.execute('''SELECT COUNT(*) AS count
                        FROM games
                        WHERE (%(user_id)s = 0 OR games.user_id = %(user_id)s)
                            AND (%(justmygames)s = 0 OR games.user_id = %(user_id)s)
                            AND game_title LIKE %(search)s''', data)
        return JSON(self.fetchone())

#----------------------------------------------------------------------
# /api/source

class source(Handler):
    @data({
        'params': {
            'game_id': int
            }
        })
    def Get(self, data):
        self.execute('''SELECT game_id, users.user_id, user_username, game_created, game_lastsaved, game_title, game_instructions, game_framerate, game_source
                        FROM games
                            LEFT JOIN users ON users.user_id = games.user_id # user must exist for each game...
                        WHERE game_id = %(game_id)s''', data)
        if self.rowcount() != 1:
            raise web.HTTPError('404 Game not found')
        row = self.fetchone();
        web.http.lastmodified(correct_date(row['game_lastsaved']))    # TODO (chs): keep separate last-modified values for screenshot and game save
        return JSON(row)

#----------------------------------------------------------------------
# /api/gameid

class gameid(Handler):
    @data({
        'params': {
            'user_id': int,
            'name': data.game_title
            }
        })
    def Get(self, data):
        self.execute('''SELECT game_id
                        FROM games
                        WHERE game_title = %(name)s
                            AND user_id = %(user_id)s''', data)
        if self.rowcount() != 1:
            raise web.HTTPError('404 Game not found')
        return JSON(self.fetchone())

#----------------------------------------------------------------------
# /api/create

class create(Handler):
    @data({
        'validate': True,
        'params': {
            'game_title': data.game_title,
            'game_source': '',
            'game_instructions': data.game_instructions,
            'game_framerate': data.game_framerate
            }
        })
    def Post(self, data):
        self.execute('''SELECT game_id
                        FROM games
                        WHERE game_title = %(game_title)s AND user_id = %(user_id)s''', data)
        if self.rowcount() != 0:
            raise web.HTTPError('409 Game name already exists')
        self.execute('''INSERT INTO games (user_id, game_created, game_lastsaved, game_source, game_title, game_instructions, game_framerate)
                        VALUES (%(user_id)s, NOW(), NOW(), %(game_source)s, %(game_title)s, %(game_instructions)s, %(game_framerate)s)''' , data)
        return JSON({ 'created': self.rowcount(), 'game_id': self.lastrowid() })

#----------------------------------------------------------------------
# /api/settings

class settings(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int,
            'game_framerate': data.game_framerate,
            'game_instructions': ''
            }
        })
    def Post(self, data):
        self.execute('''UPDATE games SET game_framerate = %(game_framerate)s, game_instructions = %(game_instructions)s
                        WHERE game_id = %(game_id)s
                            AND user_id = %(user_id)s''', data)
        return JSON({'settings_saved': self.rowcount() })

#----------------------------------------------------------------------
# /api/rename

class rename(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int,
            'name': data.game_title
            }
        })
    def Post(self, data):
        self.execute('''UPDATE games
                        SET game_lastsaved = NOW(), game_title = %(name)s
                        WHERE game_id = %(game_id)s
                            AND user_id = %(user_id)s''' , data)
        return JSON({ 'renamed': self.rowcount() })

#----------------------------------------------------------------------
# /api/rate

class rating(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int
            }
        })
    def Get(self, data):
        self.execute('''SELECT rating_stars FROM ratings
                        WHERE user_id = %(user_id)s
                            AND game_id = %(game_id)s''', data)
        if self.rowcount() == 0:
            #raise web.HTTPError('404 user %(user_id)d has not rated game %(game_id)d' % data)
            return JSON({ 'rating_stars': 0 })  # meaning not yet rated by this user
        return JSON(self.fetchone())

#----------------------------------------------------------------------
# /api/rate

class rate(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int,
            'rating': data.game_rating
            }
        })
    def Post(self, data):
        self.execute('''INSERT INTO ratings (rating_timestamp, game_id, user_id, rating_stars)
                        VALUES(NOW(), %(game_id)s, %(user_id)s, %(rating)s)
                        ON DUPLICATE KEY UPDATE rating_timestamp = NOW(), rating_stars = %(rating)s''', data)
        self.execute('''UPDATE games 
                        SET game_rating =
                            (SELECT (SELECT SUM(rating_stars) FROM ratings WHERE game_id = %(game_id)s) / (SELECT COUNT(*) FROM ratings WHERE game_id = %(game_id)s))
                        WHERE game_id = %(game_id)s''', data)
        self.execute('''SELECT game_rating
                        FROM games
                        WHERE game_id = %(game_id)s''', data)
        return JSON(self.fetchone())

#----------------------------------------------------------------------
# /api/save
# DONE (chs): require session to save game

class save(Handler):
    @data({
        'validate': True,
        'params': {
            'game_id': int,
            'game_title': data.game_title,
            'game_instructions': '',
            'game_framerate': data.game_framerate,
            'game_source': ''
            }
        })
    def Post(self, data):
        data['game_instructions'] = stripName(data['game_instructions'], 240)
        data['game_title'] = stripName(data['game_title'], 32)
        self.execute('''UPDATE games SET
                            game_lastsaved = NOW(),
                            game_title = %(game_title)s,
                            game_instructions = %(game_instructions)s,
                            game_framerate = %(game_framerate)s,
                            game_source = %(game_source)s
                        WHERE game_id = %(game_id)s
                            AND user_id = %(user_id)s''', data)
        return JSON({ 'saved': self.rowcount() })

#----------------------------------------------------------------------
# /api/screenshot

class screenshot(Handler):
    @data({
        'validate': True,
        'params': {
            'screen': data.screenshot,
            'game_id': int
            }
        })
    def Post(self, data):
        self.execute('''UPDATE games
                        SET game_screenshot = UNHEX(%(screen)s), game_lastsaved = NOW()
                        WHERE game_id = %(game_id)s
                            AND user_id = %(user_id)s''', data)
        return JSON({'posted': self.rowcount() })

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
    def Post(self, data):
        self.execute('''DELETE FROM games
                        WHERE game_id = %(game_id)s
                            AND user_id = %(user_id)s''', data)
        if self.rowcount() == 0:
            raise web.HTTPError('404 Game not found')
        return JSON({ 'deleted': self.rowcount() })

#----------------------------------------------------------------------
# /api/details

def checkPassword(hashed, password):
    try:
        attempt = bcrypt.hashpw(password, hashed)
        if attempt != hashed:
            raise web.HTTPError('401 Incorrect password')
    except ValueError:
        raise web.HTTPError('401 Incorrect password!')

# must have either resetcode or oldpassword

class details(Handler):
    @data({
        'params': {
            'user_id': int,
            'code': data.optionalresetcode,
            'email': data.email,
            'oldpassword': data.optionalpassword,
            'password': data.optionalpassword,
            'username': data.username
            }
        })
    def Post(self, data):
        row = None
        if data['code'] is None:
            self.execute('''SELECT user_password
                            FROM users
                            WHERE user_id = %(user_id)s''', data)
            if self.rowcount() != 1:
                raise web.HTTPError('401 Incorrect user_id')
            row = self.fetchone()
            checkPassword(row['user_password'], data['oldpassword'])

        if data['oldpassword'] is None:
            self.execute('''SELECT user_password
                            FROM users
                            WHERE user_id = %(user_id)s
                            AND user_resetpasswordcode=%(code)s
                            AND user_resetpasswordexpire > NOW()''', data)
            if self.rowcount() != 1:
                raise web.HTTPError('401 Bad reset code')
            row = self.fetchone()

        if row is None:
            raise web.HTTPError('401 need password or reset code!')

        data['session'] = getRandomInt()

        # new password?
        if data['password'] is not None:
            data['hashed'] = bcrypt.hashpw(data['password'], bcrypt.gensalt(12))
        else:
            data['hashed'] = row['user_password']

        # stash new details
        self.execute('''UPDATE users
                        SET user_email = %(email)s,
                            user_password = %(hashed)s,
                            user_username = %(username)s,
                            user_session = %(session)s
                        WHERE user_id = %(user_id)s''', data)
        if self.rowcount() != 1:
            raise web.HTTPError("401 Can't update account")
        return JSON({
                'user_id': data['user_id'],
                'user_username': data['username'],
                'user_session': data['session'],
                'user_email': data['email']
            })

#----------------------------------------------------------------------
# /api/register

# if data['update'] != 0:
#   UPDATE not INSERT

class register(Handler):
    @data({
        'params': {
            'email': data.email,
            'password': data.password,
            'username': data.username
            }
        })
    def Post(self, data):
        result = {}
        self.execute('''SELECT COUNT(*) AS count
                        FROM users
                        WHERE user_email=%(email)s''', data)
        if self.fetchone()['count'] != 0:
            raise web.HTTPError('409 Email already taken')
        self.execute('''SELECT COUNT(*) AS count FROM users
                        WHERE user_username=%(username)s''', data)
        if self.fetchone()['count'] != 0:
            raise web.HTTPError('409 Username already taken')
        if(len(data['password']) < 6):
            raise web.HTTPError('401 Password too short')
        data['session'] = getRandomInt()
        data['hashed'] = bcrypt.hashpw(data['password'], bcrypt.gensalt(12))
        self.execute('''INSERT INTO users (user_email, user_password, user_username, user_created, user_session)
                        VALUES (%(email)s, %(hashed)s, %(username)s, NOW(), %(session)s)''', data)
        if self.rowcount() != 1:
            raise web.HTTPError("401 Can't create account")
        result['user_id'] = self.lastrowid()
        result['user_username'] = data['username']
        result['user_session'] = data['session']
        text = 'Hello %(username)s,\n\nThanks for registering your account at 256 Pixels!\n\nThe 256 Pixels team.' % data
        html = '''Hello %(username)s,<br><p>Thanks for registering your account at 256 Pixels!</p><p>The 256 Pixels team.</p>''' % data
        sendemail.now('256 Pixels', 'admin@256pixels.net', data['username'], data['email'], 'Welcome to 256 Pixels', text, html)
        return JSON(result)

#----------------------------------------------------------------------

class userdetails(Handler):

    @data({
        'params': {
            'email': data.email,
            'code': data.resetcode
            }
        })
    def Get(self, data):
        self.execute('''SELECT user_username, user_id
                        FROM users
                        WHERE user_email = %(email)s
                            AND user_resetpasswordcode = %(code)s
                            AND user_resetpasswordexpire > NOW()''', data)
        row = self.fetchone()
        if row is None:
            raise web.HTTPError('404 Email not found or bad code')
        return JSON(row)

#----------------------------------------------------------------------
# /api/resetpw

class resetpw(Handler):

    template = """Hello %(username)s,%(br)s
%(br)s
PASSWORD RESET REQUEST%(br)s
%(br)s
%(br)s
Someone has requested a password reset for an account on 256 Pixels with this email address. If this wasn't you, please ignore this email. Otherwise, you can visit this link to reset your password: %(link)s%(br)s
%(br)s
The 256 Pixels team.%(br)s
"""

    @staticmethod
    def code():
        return ("%06X" % (getRandomInt() & 0xFFFFFF,)).replace('0', 'X').replace('1', 'Y').replace('2', 'T').replace('8', 'H').replace('B', 'K') # XYT34567H9AKCDEF

    @data({
        'params': {
            'email': data.email
            }
        })
    def Get(self, data):
        code = resetpw.code()
        data['resetcode'] = code
        self.execute('''UPDATE users
                        SET user_resetpasswordcode = %(resetcode)s,
                            user_resetpasswordexpire = NOW() + INTERVAL 1 HOUR
                        WHERE user_email = %(email)s''', data)
        if self.rowcount() != 1:
            raise web.HTTPError('404 Email not found')
        self.execute('SELECT user_username FROM users WHERE user_email = %(email)s', data)
        row = self.fetchone()
        if row is not None:
            link = "https://256pixels.net?resetpassword={0}&email={1}".format(code, urllib.quote(data['email']))
            user = { 'username': row['user_username'] }
            text = resetpw.template % dict(user, br = '', link = link)
            html = resetpw.template % dict(user, br = '<br>', link = "<a href = '{0}'>{0}</a>".format(link))
            sendemail.now('256 Pixels', 'admin@256pixels.net', row['user_username'], data['email'], 'Password reset request at 256 Pixels', text, html)
            return JSON({ 'email_sent': True })

#----------------------------------------------------------------------
# /api/login

class login(Handler):
    @data({
        'params': {
            'email': data.email,
            'password': data.password
            }
        })
    def Post(self, data):
        result = {}
        self.execute('''SELECT user_id, user_password
                        FROM users
                        WHERE user_email = %(email)s''', data)
        if self.rowcount() != 1:
            raise web.HTTPError('401 Incorrect email address')
        row = self.fetchone()
        checkPassword(row['user_password'], data['password'])

        data['user_id'] = row['user_id']
        data['session'] = getRandomInt()
        self.execute('''UPDATE users
                        SET user_session = %(session)s
                        WHERE user_email = %(email)s''', data)
        if self.rowcount() != 1:
            raise web.HTTPError("500 Can't update session for %(email)s!?" % data)

        self.execute('''SELECT user_id, user_username, user_session, user_email
                        FROM users
                        WHERE user_email = %(email)s''', data)
        if self.rowcount() != 1:
            raise web.HTTPError('500 Login error')
        row = self.fetchone()
        return JSON(row)

#----------------------------------------------------------------------
# /api/refreshSession

class refreshSession(Handler):
    @data({
        'params': {
            'user_id': int,
            'user_session': int,
            'user_email': data.email,
            'user_username': data.username
        }
    })
    def Get(self, data):
        data['new_session'] = getRandomInt()
        self.execute('''UPDATE users
                        SET user_session = %(new_session)s
                        WHERE user_id = %(user_id)s
                            AND user_username = %(user_username)s
                            AND user_email = %(user_email)s
                            AND user_session = %(user_session)s''', data)
        if self.rowcount() != 1:
            raise web.HTTPError('404 Session not found')
        data['user_session'] = data['new_session']
        return JSON(data)

#----------------------------------------------------------------------
# /api/endSession

class endSession(Handler):
    @data({
        'validate': True,
    })
    def Get(self, data):
        self.execute('''UPDATE users
                        SET user_session = NULL    
                        WHERE user_id = %(user_id)s
                            AND user_session = %(user_session)s''', data)
        if self.rowcount() != 1:
            raise web.HTTPError('401 Error terminating session')
        return JSON({ 'status': 'ok' })

#----------------------------------------------------------------------
# favicon.ico

class favicon:
    def GET(self):
        return ICON(open('favicon.ico', 'rb').read())

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
    corner = Image.new('RGB', (radius, radius + 1), (0, 0, 0))
    draw = ImageDraw.Draw(corner)
    draw.pieslice([0, 0, radius * 2, radius * 2], 180, 270, fill=fill)
    rectangle.paste(corner, (0, 0))
    rectangle.paste(corner.rotate(90), (0, height - radius)) # Rotate the corner and paste it
    rectangle.paste(corner.rotate(180), (width - radius, height - radius - 1))
    rectangle.paste(corner.rotate(270), (width - radius - 1, 0))
    return rectangle

pixels = [round_rectangle((14, 14), 2, p) for p in palette]

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
    s = s.resize((128, 128), Image.ANTIALIAS)
    s.save(buf, 'PNG')
    return buf.getvalue()

defaultScreenshot = get_screenshot(os.urandom(128))

class screen(Handler):
    def Get(self, game_id):
        self.execute('''SELECT game_screenshot, game_lastsaved FROM games
                        WHERE game_id = %(game_id)s''', locals())
        if self.rowcount() != 1:
            raise web.HTTPError('404 game not found')
        row = self.fetchone()
        web.http.lastmodified(correct_date(row['game_lastsaved']))    # TODO (chs): keep separate last-modified values for screenshot and game save
        return PNG(get_screenshot(row['game_screenshot']))

#----------------------------------------------------------------------
# play

class play(Handler):
    def Get(self, game_id):
        self.execute('''SELECT game_id, game_source, game_title, game_instructions, game_framerate, game_lastsaved
                        FROM games
                        WHERE game_id = %(game_id)s''', locals())
        if self.rowcount() == 0:
            return HTML(render.nogame(game_id))
        row = self.fetchone()
        web.http.lastmodified(correct_date(row['game_lastsaved']))
        return HTML(render.play(row))

#----------------------------------------------------------------------

app = web.application(urls, globals())

if __name__ == '__main__':
    app.run()
else:
    application = app.wsgifunc()
