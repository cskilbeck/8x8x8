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

import sys, urlparse, urllib2, re, pprint, ssl, subprocess, os, contextlib, string

scriptblock_regex = r'(.*?)<!--\s*SCRIPTBLOCK\s*\((.+?)\)\s*-->(.*)<!--\s*ENDSCRIPTBLOCK\s*\((.+?)\)\s*-->(.*)'
script_replace_regex = r'\1<script src="\2.min.js"></script>\5'
script_regex = r'<script\s*src\s*=\s*["\']\s*(.*?)\s*["\']\s*>\s*<\s*/script\s*>'

styleblock_regex = r'(.*?)<!--\s*STYLEBLOCK\s*\((.+?)\)\s*-->(.*)<!--\s*ENDSTYLEBLOCK\s*\((.+?)\)\s*-->(.*)'
style_replace_regex = r'\1<link rel="stylesheet" href="\2.min.css">\5'
style_regex = r'<link\s*rel\s*=\s*["\']stylesheet["\']\s*href\s*=\s*["\']\s*(.*?)\s*["\']\s*>'


#-----------------------------------------------------------------------------------------------------------------------
# find the <!--SCRIPTBLOCK(name)-->(.*)<!--ENDSCRIPTBLOCK(name)-->

def get_scriptblock(html, pattern, replace_pattern):
    regex = re.compile(pattern, re.S|re.I)
    match = re.match(regex, html)
    if match.group(2) != match.group(4):
        raise Exception('Mismatched scriptblock names')
    return match.group(2), match.group(3), regex.sub(replace_pattern, html)

#-----------------------------------------------------------------------------------------------------------------------
# extract the script urls

def get_scripts(block, pattern):
    regex = re.compile(pattern, re.S|re.I)
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
        file = urllib2.urlopen(url, context = ctx).read()
        print "Got", len(file), "bytes from", url
        files.append(file)
    return '\n;\n'.join(files)

#-----------------------------------------------------------------------------------------------------------------------
# minify the joined up script

def minify_script(filename, output_filename):
    minifier = '"c:\Program Files (x86)\Microsoft\Microsoft Ajax Minifier\AjaxMinifier.exe"'
    subprocess.check_output('%(minifier)s %(filename)s -o %(output_filename)s' % locals())

#-----------------------------------------------------------------------------------------------------------------------
# save a file

def save_file(text, filename):
    with contextlib.closing(open(filename, 'w')) as file:
        file.write(string.replace(text, '\r\n', '\n'))

#-----------------------------------------------------------------------------------------------------------------------
# main

try:
    host = sys.argv[1] if len(sys.argv) == 2 else 'http://localhost:8080'
    context = ssl._create_unverified_context()
    url = urlparse.urlparse(host)
    html = urllib2.urlopen(url.geturl(), context = context).read()

    scriptname, scriptblock, html = get_scriptblock(html, scriptblock_regex, script_replace_regex)
    scripts = get_scripts(scriptblock, script_regex)
    scriptsource = join_scripts(scripts, url.scheme + "://" + url.netloc)

    stylename, styleblock, html = get_scriptblock(html, styleblock_regex, style_replace_regex)
    styles = get_scripts(styleblock, style_regex)
    stylesource = join_scripts(styles, url.scheme + "://" + url.netloc)

    save_file(scriptsource, scriptname + '.js')
    save_file(stylesource, stylename + '.css')
    minify_script(scriptname + '.js', scriptname + '.min.js')
    minify_script(stylename + '.css', stylename + '.min.css')
    save_file(html, 'index.html')

except Exception, e:
    print str(e)
    sys.exit(2)
