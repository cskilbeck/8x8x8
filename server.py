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
    '/favicon.ico', 'favicon',
    '/save', 'save',
    '/count', 'count',
    '/list', 'list')

#----------------------------------------------------------------------

def date_handler(obj):
    return obj.isoformat() if hasattr(obj, 'isoformat') else obj

def getJSON(x):
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
                    cur.execute("SELECT COUNT(*) AS count "
                        "FROM games "
                        "WHERE user_id = %(user_id)s AND game_title LIKE %(search)s"
                        , params)
                    result['count'] = cur.fetchone()['count']
        except mdb.Error, e:
            web.ctx.status = '500 Internal server error'
            result = {"status": "error"}
        except ValueError:
            web.ctx.status = '400 Invalid parameters'
            result = {"status": "error"}
        return getJSON(result)

#----------------------------------------------------------------------
# list
# GET: (user_id) [length, offset, datebegin, dateend, search, orderby=[rating,created,saved,name]]

class list:
    def GET(self):
        data = web.input()
        result = {"status": "ok"}
        params = {
            'user_id': int(data.get('user_id', 0)),
            'search': '%' + data.get('search', '').replace('*', '%').replace('.', '_') + '%',
            'length': min(100, int(data.get('length', 20))),
            'offset': min(100, int(data.get('offset', 0)))
        }
        with closing(opendb()) as db:
            with closing(db.cursor()) as cur:
                try:
                    cur.execute("SELECT game_id, user_id, game_title, game_lastsaved, game_created "
                        "FROM games "
                        "WHERE user_id = %(user_id)s AND game_title LIKE %(search)s"
                        "ORDER BY game_lastsaved, game_created DESC "
                        "LIMIT %(length)s OFFSET %(offset)s"
                        , params)
                    result['games'] = cur.fetchall()
                except mdb.Error, e:
                    web.ctx.status = '500 Internal server error'
                    result["status"] = "error"
        return getJSON(result)

#----------------------------------------------------------------------
# save
# POST: {'user_id': 1, 'source': 'sourcecode', 'name': 'snake' }

class save:
    def POST(self):
        data = web.input()
        result = {"status": "ok"}
        for i in ['user_id', 'source', 'name']:
            if not i in data:
                web.ctx.status = '400 Missing parameter'
        # TODO (chs): sanitize name: strip invalid chars and limit length
        try:
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    cur.execute("SELECT * FROM users WHERE user_id =%(user_id)s", data)
                    if cur.fetchone() is None:
                        web.ctx.status = '401 Invalid user_id'
                    else:
                        cur.execute(
                            "INSERT INTO games (user_id, game_created, game_lastsaved, game_source, game_title) "
                            "VALUES(%(user_id)s, NOW(), NOW(), %(source)s, %(name)s) "
                            "ON DUPLICATE KEY UPDATE game_source = VALUES(game_source), game_lastsaved = VALUES(game_lastsaved)"
                            , data)
                        result['saved'] = cur.rowcount
        except ValueError:
            web.ctx.status = '404 Invalid parameter'
            result["status"] = "error"
        except mdb.Error, e:
            result["status"] = "error"
            web.ctx.status = '500 Internal server error'
        return getJSON(result)


#----------------------------------------------------------------------
# login (or register)
# POST: { 'email': 'charlie@skilbeck.com,' 'password': 'henry1' }

class login:
    def POST(self):
        data = web.input()
        result = {"status": "error"}
        web.header('Content-type', 'application/json')
        user_id = 0
        if data['email'] is None or data['password'] is None:
            web.ctx.status = '400 Missing parameter'
        else:
            with closing(opendb()) as db:
                with closing(db.cursor()) as cur:
                    try:
                        cur.execute("SELECT * FROM users WHERE user_email =%(email)s", data)
                        row = cur.fetchone()
                        if row is None:
                            cur.execute("INSERT INTO users (user_email, user_password, user_created) VALUES (%(email)s, %(password)s, NOW())", data)
                            user_id = cur.lastrowid
                        else:
                            if row['user_password'] == data['password']:
                                user_id = row['user_id']
                            else:
                                web.ctx.status = '401 Incorrect password'
                        if user_id != 0:
                            session().user_id = user_id
                            result['user_id'] = user_id
                            result['status'] = "ok"
                    except mdb.Error, e:
                        web.ctx.status = '500 Internal server error'
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