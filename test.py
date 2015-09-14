import sys
from inspect import getargspec

def checked(func):

    def wrapper(*kargs, **kwargs):
        asp = getargspec(func)
        nargs = len(asp.args)
        diff = nargs - len(asp.defaults)
        data = {}
        for i in range(diff, nargs):
            default = asp.defaults[i - diff]
            name = asp.args[i]
            is_required = isinstance(default, type)
            if not name in kwargs:
                if is_required:
                    raise KeyError('Parameter %s is missing (expected: %s)' % (name, default.__name__))
                else:
                    data[name] = default
            else:
                if is_required:
                    data[name] = default(kwargs[name])
                else:
                    data[name] = type(default)(kwargs[name])

        func(*kargs, **data)

    return wrapper

@checked
def handle(dbase, cursor, username=str, email=str, password=str, comments='No comment', index=int, age=0):
    print username, email, password, comments, index, age

handle(None, None, **{'username': "bob", 'email': "bill", 'password': "secret", 'index': '1'})
