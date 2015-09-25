class Decorator(object):

    def __init__(self, paramSpec, validateSession = False):
        self.paramSpec = paramSpec
        self.validateSession = validateSession

    def __call__(self, original_func):

        def new_function(slf, *args, **kwargs):
            print 'X is', slf.x, "paramSpec is", self.paramSpec
            original_func(slf, *args, **kwargs)

        return new_function


class Bar(object):

    def __init__(self, x):
        self.x = x

    @Decorator('Barry')
    def foo(self, bob):
        print 'in Bar::foo, arg is ' + bob

class Baz(object):

    def __init__(self, x):
        self.x = x

    @Decorator('Bazzy')
    def foo(self, bob):
        print 'in Baz::foo, are is ' + bob

print 'before instantiating'
b = Bar(1)
b2 = Baz(2)

print 'calling b.foo()'
b.foo('A')

print 'calling b2.foo()'
b2.foo('B')
