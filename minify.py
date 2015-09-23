#-----------------------------------------------------------------------------------------------------------------------
# join, minify and then compress the scripts in an html file
# surround the script tags you want merged with <!--SCRIPTBLOCK(name)--> and <!--ENDSCRIPTBLOCK(name)-->
#   a new html file with the SCRIPTBLOCK section replaced with a single script tag: <script src='name.min.js'></script> will be saved in current directory
#   name.js (concatenated scripts) and name.min.js (concatenated, minified scripts) will be saved in current directory
#
# usage: minify.py <url>
# eg: minify.py http://localhost:8080/index.html
#
# TODO (chs): allow minifier to be specified as an option (hardcodrd to use AjaxMinifier.exe, currently)
# TODO (chs): make it replace all the SCRIPTBLOCKs, not just the first one it finds
#-----------------------------------------------------------------------------------------------------------------------

import sys, urlparse, urllib2, re, pprint, ssl, subprocess, os, contextlib

#-----------------------------------------------------------------------------------------------------------------------
# find the <!--SCRIPTBLOCK(name)-->(.*)<!--ENDSCRIPTBLOCK(name)-->

def get_scriptblock(html):
    pattern = r'(.*?)<!--\s*SCRIPTBLOCK\s*\((.+?)\)\s*-->(.*)<!--\s*ENDSCRIPTBLOCK\s*\((.+?)\)\s*-->(.*)'
    regex = re.compile(pattern, re.S|re.I)
    match = re.match(regex, html)
    if match.group(2) != match.group(4):
        raise Exception('Mismatched scriptblock names')
    return match.group(2), match.group(3), regex.sub(r'\1<script src="\2.min.js"></script>\5', html)

#-----------------------------------------------------------------------------------------------------------------------
# extract the script urls

def get_scripts(block):
    regex = re.compile(r'<script\s*src\s*=\s*["\']\s*(.*?)\s*["\']\s*>\s*<\s*/script\s*>', re.S|re.I)
    return re.findall(regex, block)

#-----------------------------------------------------------------------------------------------------------------------
# join the scripts together

def join_scripts(scripts, base_url):
    files = []
    for scriptname in scripts:
        url = scriptname
        ctx = context
        if scriptname[0:4].lower() != 'http' and scriptname[0:2] != '//':
            ctx = None
            url = urlparse.urljoin(base_url, scriptname)
        files.append(urllib2.urlopen(url, context = ctx).read())
    return ';'.join(files)

#-----------------------------------------------------------------------------------------------------------------------
# minify the joined up script

def minify_script(filename, output_filename):
    minifier = '"c:\Program Files (x86)\Microsoft\Microsoft Ajax Minifier\AjaxMinifier.exe"'
    subprocess.check_output('%(minifier)s %(filename)s -o %(output_filename)s' % locals())

#-----------------------------------------------------------------------------------------------------------------------
# save a file

def save_file(text, filename):
    with contextlib.closing(open(filename, 'w')) as file:
        file.write(text)

#-----------------------------------------------------------------------------------------------------------------------
# main

try:
    if len(sys.argv) != 2:
        raise Exception('minify.py <url>')

    context = ssl._create_unverified_context()
    url = urlparse.urlparse(sys.argv[1])
    html = urllib2.urlopen(url.geturl(), context = context).read()
    name, block, html = get_scriptblock(html)
    scripts = get_scripts(block)
    source = join_scripts(scripts, url.scheme + "://" + url.netloc)
    save_file(source, name + '.js')
    minify_script(name + '.js', name + '.min.js')
    print html

except Exception, e:
    print str(e)
    sys.exit(2)
