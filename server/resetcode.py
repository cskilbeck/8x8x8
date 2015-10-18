import os, struct, binascii, re

def _getRandomInt():
    while True:
        i = struct.unpack("<L", os.urandom(4))[0]
        if i != 0:
            return i

# hex digit replacement map

_x = 'CFHJKLMNPRTVWXYZ'

# hex to and from replacement map

def _str_from_long(i):
    return ''.join([_x[(i >> p) & 15:((i >> p) & 15) + 1] for p in xrange(28,-4,-4)])

def _long_from_str(s):
    return sum([_x.index(x) << (7-i) * 4 for i,x in enumerate(s.upper())])

def regex():
    return re.compile('[' + _x + ']{8}')

# a 32 bit reset code

class resetcode():

    ''' a 32 bit long reset code with a letterized representation for readability '''

    def __init__(self, code = None):
        if code is None:
            self.code = _getRandomInt()
        elif type(code) == str:
            if len(code) != 8:
                raise ValueError('Invalid reset code')
            self.code = _long_from_str(code)
        elif type(code) == long:
            self.code = code
        else:
            print type(code)
            raise ValueError('Invalid reset code')

    def __long__(self):
        return self.code

    def __str__(self):
        return _str_from_long(self.code)

    def __eq__(self, o):
        if o is str:
            o = _long_from_str(o)
        return self.code == o

    def __ne__(self, o):
        if o is str:
            o = _long_from_str(o)
        return self.code != o

if __name__ == '__main__':

    print "Random"
    a = resetcode()
    b = resetcode(long(a))
    c = resetcode(str(a))
    print str(a), str(b), str(c)
    print "%08x %08x %08x" % (long(a), long(b), long(c))

    print "-1"
    a = resetcode(0xffffffff)
    b = resetcode(long(a))
    c = resetcode(str(resetcode(0xffffffff)))
    print str(a), str(b), str(c)
    print "%08x %08x %08x" % (long(a), long(b), long(c))

    print "1<<31"
    a = resetcode(1<<31)
    b = resetcode(long(a))
    c = resetcode(str(a))
    print str(a), str(b), str(c)
    print "%08x %08x %08x" % (long(a), long(b), long(c))
