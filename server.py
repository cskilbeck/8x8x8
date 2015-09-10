#----------------------------------------------------------------------

import web
from contextlib import closing
import MySQLdb as mdb
import MySQLdb.cursors
import pprint
import bcrypt

#----------------------------------------------------------------------

app = None
render = web.template.render('templates/')
urls = (

    # main SPA
    '/', 'index',

    # APIs
    '/login', 'login'
)

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
# login (or register)
# POST: { 'email': 'charlie@skilbeck.com,' 'password': 'henry1' }

class login:
    def POST(self):
        data = web.input()
        result = None
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
                            result = { 'user_id': user_id }
                    except mdb.Error, e:
                        web.ctx.status = '500 Internal server error'
        return result

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