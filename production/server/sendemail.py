# TODO (chs): send emails in a thread
# TODO (chs): verification code in the mail

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import dbase_nogit as DB
import threading

def _send(address, subject, text, html):
    dbvars = DB.Vars()
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = 'admin@256pixels.net'
    msg['To'] = address
    part1 = MIMEText(text, 'plain')
    part2 = MIMEText('<html><head></head><body>%s</body></html>' % html, 'html')
    msg.attach(part1)
    msg.attach(part2)
    print "Sending welcome mail to", address
    s = smtplib.SMTP('smtp.gmail.com', 587, '256pixels.net', 20)
    s.ehlo()
    s.starttls()
    s.ehlo()
    s.login(dbvars.mailuser, dbvars.mailpwd)
    s.sendmail('admin@256pixels.net', address, msg.as_string())
    s.quit()
    print "Sent welcome mail to", address

def now(address, subject, text, html):
    threading.Thread(target=_send, args=(address, subject, text, html)).start()
