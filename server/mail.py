# TODO (chs): send emails in a thread
# TODO (chs): verification code in the mail

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.Header import Header
from email.Utils import parseaddr, formataddr
import dbase_nogit as DB
import threading
import re

striplinks = re.compile(r'<a.*?>(.*?)</a>')
stripparastart = re.compile(r'<p>')
stripparaend = re.compile(r'</p>')
stripbreak = re.compile(r'<br>')

def html2text(x):
    x = re.sub(striplinks, r'\1', x)
    x = re.sub(stripparastart, '', x)
    x = re.sub(stripparaend, '\n\n', x)
    x = re.sub(stripbreak, '\n', x)
    return x

def _send(fromname, fromaddr, name, address, subject, html):

    header_charset = 'ISO-8859-1'

    for body_charset in 'US-ASCII', 'ISO-8859-1', 'UTF-8':
        try:
            html.encode(body_charset)
        except UnicodeError:
            pass
        else:
            break

    sender_name = str(Header(unicode(fromname), header_charset))
    recipient_name = str(Header(unicode(name), header_charset))
    fromaddr = fromaddr.encode('ascii')
    address = address.encode('ascii')
    msg = MIMEMultipart('alternative')
    msg['From'] = formataddr((sender_name, fromaddr))
    msg['To'] = formataddr((recipient_name, address))
    msg['Subject'] = Header(unicode(subject), header_charset)
    part1 = MIMEText(html2text(html).encode(body_charset), 'plain', body_charset)
    part2 = MIMEText(('<html><head></head><body>%s</body></html>' % html).encode(body_charset), 'html', body_charset)
    msg.attach(part1)
    msg.attach(part2)
    s = smtplib.SMTP('smtp.gmail.com', 587, '256pixels.net', 20)
    s.ehlo()
    s.starttls()
    s.ehlo()
    s.login(DB.Vars.mailuser, DB.Vars.mailpwd)
    s.sendmail(fromaddr, address, msg.as_string())
    s.quit()
    print "Sent welcome mail to", address

def send(fromname, fromaddr, toname, toaddress, subject, htmlbody):
    threading.Thread(target = _send, args = (fromname, fromaddr, toname, toaddress, subject, htmlbody)).start()
