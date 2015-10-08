# TODO (chs): send emails in a thread
# TODO (chs): verification code in the mail

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import dbase_nogit as DB
import threading

def _send(fromname, fromaddr, name, address, subject, text, html):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = "{0} <{1}>".format(fromname, fromaddr)
    msg['To'] = "{0} <{1}>".format(name, address)
    part1 = MIMEText(text, 'plain')
    part2 = MIMEText('<html><head></head><body>%s</body></html>' % html, 'html')
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
