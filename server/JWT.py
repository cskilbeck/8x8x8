from time import time
from hmac import new as hashed
from hashlib import sha256
from json import dumps, loads
from base64 import urlsafe_b64encode as encode64, urlsafe_b64decode as decode64

def create(secret, payload, lifetime = None):
    header = { 'typ': 'JWT', 'alg': 'HS256' }

    if lifetime is not None:
        header['exp'] = time() + lifetime

    payload = encode64(dumps(header)) + '.' + encode64(dumps(payload))

    return payload + '.' + encode64(hashed(secret, msg = payload, digestmod = sha256).digest())

def extract(secret, token):

    parts = token.split('.')

    if len(parts) != 3:
        raise ValueError('Invalid JWT format')

    header = loads(decode64(parts[0]))

    if not 'typ' in header or header['typ'] != 'JWT':
        raise ValueError('Invalid JWT header')

    if not 'alg' in header or header['alg'] != 'HS256':
        raise ValueError('Unsupported JWT hash algorithm')

    if 'exp' in header and time() > header['exp']:
        raise ValueError('JWT expired')

    if hashed(secret, msg = parts[0] + '.' + parts[1], digestmod = sha256).digest() != decode64(parts[2]):
        raise ValueError('Invalid JWT hash')

    return { 'header': header, 'payload': loads(decode64(parts[1])) }

if __name__ == '__main__':
    token = create('secret', { 'user_id': 1, 'admin': False }, 10)

    try:
        cracked = extract('secret', token)
        print "RESULT:", cracked
    except ValueError,v:
        print "FAIL:", v

    try:
        failed = extract('wrong', token)
        print "FAIL: invalid secret passed!?"
    except ValueError,v:
        print "RESULT:", v
