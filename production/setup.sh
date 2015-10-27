#!/bin/bash
# set up the web server
echo "Setting up the web server..."

function writeable() {
  if [[ -w $1 ]]; then
    return 1
  else
    return 0
  fi
}

# only root can run it
if writeable '/root'; then

    # install some packages
    apt-get install apache2 apache2.2-common apache2-mpm-prefork apache2-utils libexpat1 ssl-cert
    apt-get install python-pip python-dev build-essential libapache2-mod-wsgi
    apt-get install zlib1g zlib1g-dev

    # install some python libs
    pip --no-cache-dir install web.py py-bcrypt iso8601 MySQL-python pypng Pillow

    # make the site conf file
    sed "s/\%1/$1/" site.conf >/etc/apache2/sites-available/$1.conf

    # and enable it
    a2ensite $1

    # enable some apache2 modules
    a2enmod expires headers rewrite

    # restart apache2
    service apache2 restart

else
    echo "Can't write to /etc/apache2 folder - need sudo"

