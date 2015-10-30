#!/bin/bash

if [[ $# -lt 1 ]]; then
    echo "Need site name"
    exit 1
fi

if [[ ! -w '/root' ]]; then
    echo "Permission denied - use sudo?"
    exit 1
fi

echo "Setting up $1"

# install
apt-get -y install git
apt-get -y install apache2 apache2-mpm-prefork apache2-utils libexpat1 ssl-cert
apt-get -y install python-pip python-dev build-essential libapache2-mod-wsgi
apt-get -y install zlib1g zlib1g-dev
pip --no-cache-dir install web.py py-bcrypt iso8601 MySQL-python pypng Pillow
sed "s/\%1/$1/" site.conf >/etc/apache2/sites-available/$1.conf

# get
mkdir -p /usr/local/www/$1
git init /usr/local/www/$1
cd /usr/local/www/$1
mkdir logs
git remote add origin https://github.com/cskilbeck/8x8x8.git
git config core.sparsecheckout true
echo "public_html/*" > .git/info/sparse-checkout
echo "server/*" >.git/info.sparse-checkout
git pull --depth=1 origin master
rm -r .git

# setup apache
service apache2 stop
a2ensite $1.conf
a2enmod expires headers rewrite
a2dismod autoindex
service apache2 start
