import os, struct, binascii, re

# hex digit replacement map

_x = 'CFHJKLMNPRTVWXYZ'

def regex():
    return re.compile('[' + _x + ']{8}')

def fromString(s):
    return sum([_x.index(x) << (7-i) * 4 for i,x in enumerate(s.upper())])

def fromLong(i):
    return ''.join([_x[(i >> p) & 15:((i >> p) & 15) + 1] for p in xrange(28,-4,-4)])

def random():
    while True:
        i = struct.unpack("<L", os.urandom(4))[0]
        if i != 0:
            return i
