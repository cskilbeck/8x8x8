import os, struct, binascii, re

_x = 'CFHJKLMNPRTVWXYZ'
regex = re.compile('[' + _x + ']{8}')

def random():
    return struct.unpack("<L", os.urandom(4))[0]

def as_long(s):
    return sum([_x.index(x) << (7-i) * 4 for i,x in enumerate(s.upper())])

def as_str(i):
    return ''.join([_x[(i >> p) & 15:((i >> p) & 15) + 1] for p in xrange(28,-4,-4)])
