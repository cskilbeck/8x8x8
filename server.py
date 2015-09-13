#----------------------------------------------------------------------
# TODO (chs): proper login/session thing
# TODO (chs): bcrypt password
#----------------------------------------------------------------------

import web
from contextlib import closing
import MySQLdb as mdb
import MySQLdb.cursors
import pprint
import bcrypt
import json

#----------------------------------------------------------------------

app = None
render = web.template.render('templates/')
urls = (
    '/', 'index',
    '/login', 'login',
    '/register', 'register',
    '/favicon.ico', 'favicon',
    '/save', 'save',
    '/source', 'source',
    '/count', 'count',
    '/list', 'list')

#----------------------------------------------------------------------

def date_handler(obj):
    return obj.isoformat() if hasattr(obj, 'isoformat') else obj

def getJSON(x):
    web.header('Content-type', 'application/json')
    return json.dumps(x, indent = 4, separators=(',',': '), default = date_handler)

#----------------------------------------------------------------------

def session():
    global app
    if web.config.get('_session') is None:
        s = web.session.Session(app, web.session.DiskStore('sessions'), {'count': 0})
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
# favicon.ico

class favicon:
    def GET(self):
        raise web.seeother("/static/favicon.ico")

#----------------------------------------------------------------------

def paramcheck(params, argNames):
    pprint.pprint(params)
    pprint.pprint(argNames)
    for i in argNames:
        if not i in params:
            raise ValueError

#----------------------------------------------------------------------
# count
# GET: (used_id, search)

class count:
    def GET(self):
        data = web.input()
        result = {"status": "ok"}
        try:
            params = {
                'user_id': int(data.get('user_id', 0)),
                'search': '%' + data.get('search', '').replace('*', '%').replace('.', '_') + '%'
            }
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    cur.execute("""SELECT COUNT(*) AS count 
                                    FROM games 
                                    WHERE user_id = %(user_id)s AND game_title LIKE %(search)s"""
                                , params)
                    result['count'] = cur.fetchone()['count']
        except ValueError:
            web.ctx.status = '400 Invalid parameters'
            result['status'] = "error"
        except mdb.Error, e:
            web.ctx.status = '500 Database problem'
            result['status'] = "error"
        return getJSON(result)

#----------------------------------------------------------------------
# source

class source:
    def GET(self):
        data = web.input()
        result = {"status": "ok"}
        try:
            paramcheck(data, ['game_id'])
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    cur.execute("SELECT game_source FROM GAMES WHERE game_id=%s", (int(data['game_id']),))
                    if cur.rowcount == 0:
                        web.ctx.status = '400 game not found'
                        result = {"status": "error"}
                    else:
                        row = cur.fetchone()
                        result['source'] = row['game_source']
        except ValueError:
            web.ctx.status = '400 Invalid parameters'
            result['status'] = "error"
        except mdb.Error, e:
            web.ctx.status = '500 Database problem'
            result['status'] = "error"
        return getJSON(result)

#----------------------------------------------------------------------
# list
# GET: (user_id) [length, offset, datebegin, dateend, search, orderby=[rating,created,saved,name]]

class list:
    def GET(self):
        data = web.input()
        pprint.pprint(data)
        result = {"status": "ok"}
        params = {
            'user_id': int(data.get('user_id', 0)),
            'search': '%' + data.get('search', '').replace('*', '%').replace('.', '_') + '%',
            'length': min(100, int(data.get('length', 20))),
            'offset': min(100, int(data.get('offset', 0)))
        }
        try:
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    cur.execute("""SELECT game_id, games.user_id, game_title, game_lastsaved, game_created, user_username
                                    FROM games
                                        INNER JOIN users ON users.user_id = games.user_id 
                                    WHERE games.user_id = %(user_id)s AND game_title LIKE %(search)s
                                    ORDER BY game_lastsaved, game_created DESC
                                    LIMIT %(length)s OFFSET %(offset)s"""
                                , params)
                    result['games'] = cur.fetchall()
        except mdb.Error, e:
            pprint.pprint(e)
            web.ctx.status = '500 Database problem'
            result["status"] = "error"
        return getJSON(result)

#----------------------------------------------------------------------
# save
# POST: {'user_id': 1, 'source': 'sourcecode', 'name': 'snake' }

class save:
    def POST(self):
        data = web.input()
        result = {"status": "ok"}
        try:
            paramcheck(data, ['user_id', 'source', 'name'])
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    cur.execute("SELECT * FROM users WHERE user_id =%(user_id)s", data)
                    if cur.fetchone() is None:
                        web.ctx.status = '401 Invalid user_id'
                    else:
                        cur.execute("""INSERT INTO games (user_id, game_created, game_lastsaved, game_source, game_title)
                                        VALUES (%(user_id)s, NOW(), NOW(), %(source)s, %(name)s)
                                        ON DUPLICATE KEY UPDATE game_source = VALUES(game_source), game_lastsaved = VALUES(game_lastsaved)"""
                                    , data)
                        result['saved'] = cur.rowcount
        except ValueError:
            web.ctx.status = '404 Invalid parameter'
            result["status"] = "error"
        except mdb.Error, e:
            result["status"] = "error"
            web.ctx.status = '500 Database problem'
        return getJSON(result)


#----------------------------------------------------------------------
# register
# POST: { 'email': 'charlie@skilbeck.com', 'password': 'henry1', 'username': 'cskilbeck' }

class register:
    def parameters(self):
        return ['username', 'email', 'password']

    def POST(self):
        data = web.input()
        result = { 'status': 'error' }
        user_id = 0
        try:
            paramcheck(data, ['username', 'email', 'password'])
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    cur.execute("SELECT COUNT(*) AS count FROM users WHERE user_email=%(email)s", data)
                    if cur.fetchone()['count'] != 0:
                        result['message'] = 'Email already taken'
                    else:
                        cur.execute("SELECT COUNT(*) AS count FROM users WHERE user_name=%(username)s", data)
                        if cur.fetchone()['count'] != 0:
                            result['message'] = 'Username already taken'
                        else:
                            cur.execute("INSERT INTO users (user_email, user_password, user_name, user_created) VALUES (%(email)s, %(password)s, %(username)s, NOW())", data)
                            user_id = cur.lastrowid
                            session().user_id = user_id
                            result['status'] = 'ok'
                            result['user_id'] = user_id
                            result['user_username'] = data['username']
        except ValueError:
            web.ctx.status = '404 Invalid parameter'
        except mdb.Error, e:
            web.ctx.status = '500 Database problem'
        return getJSON(result)

#----------------------------------------------------------------------
# login
# POST: { 'email': 'charlie@skilbeck.com', 'password': 'henry1' }

class login:
    def POST(self):
        data = web.input()
        result = {"status": "error"}
        user_id = 0
        try:
            paramcheck(data, ['email', 'password'])
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    cur.execute("SELECT * FROM users WHERE user_email =%(email)s", data)
                    if cur.rowcount > 0:
                        row = cur.fetchone()
                        if row['user_password'] == data['password']:
                            user_id = row['user_id']
                            session().user_id = user_id
                            result['status'] = "ok"
                            result['user_id'] = user_id
                            result['user_username'] = row['user_username']
                        else:
                            web.ctx.status = '401 Incorrect username or password'
                    else:
                        web.ctx.status = '401 Incorrect username or password'
        except ValueError:
            web.ctx.status = '404 Invalid parameter'
        except mdb.Error, e:
            web.ctx.status = '500 Database problem'
        return getJSON(result)

#----------------------------------------------------------------------
# index
# GET: /

class index:
    def GET(self):
        token = session().get('session')
        if token is not None:
            web.setcookie('session', session, 60 * 24 * 30)
        else:
            web.setcookie('session', "", -1)
        return render.index()

#----------------------------------------------------------------------

if __name__ == '__main__':
    app = web.application(urls, globals())
    app.run()