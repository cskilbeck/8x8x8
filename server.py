import web

render = web.template.render('templates/')

urls = (
    '/', 'index'
)

class index:
    def GET(self):
        return render.index()

if __name__ == '__main__':
    web.application(urls, globals()).run()
