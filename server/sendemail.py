# TODO (chs): send emails in a thread
# TODO (chs): verification code in the mail

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.Header import Header
from email.Utils import parseaddr, formataddr
import dbase_nogit as DB
import threading

def _send(fromname, fromaddr, name, address, subject, text, html):

    header_charset = 'ISO-8859-1'

    for body_charset in 'US-ASCII', 'ISO-8859-1', 'UTF-8':
        try:
            body.encode(body_charset)
        except UnicodeError:
            pass
        else:
            break

    sender_name = str(Header(unicode(fromname), header_charset))
    recipient_name = str(Header(unicode(name), header_charset))
    fromaddr = fromaddr.encode('ascii')
    addr = addr.encode('ascii')
    msg = MIMEMultipart('alternative')
    msg['From'] = formataddr((sender_name, fromaddr))
    msg['To'] = formataddr((recipient_name, addr))
    msg['Subject'] = Header(unicode(subject), header_charset)
    part1 = MIMEText(text.encode(body_charset), 'plain', body_charset)
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

def now(fromname, fromaddr, name, address, subject, text, html):
    threading.Thread(target=_send, args=(fromname, fromaddr, name, address, subject, text, html)).start()
