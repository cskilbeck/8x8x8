@echo off


WinSCP /script=sync.scp /parameter // %CD%\.. DigitalOcean_Web_Server

start /b WinSCP /command "open DigitalOcean_Web_Server" "lcd %CD%" "option batch continue" "keepuptodate ..\public_html /usr/local/www/256pixels.net/public_html"
start /b WinSCP /command "open DigitalOcean_Web_Server" "lcd %CD%" "option batch continue" "keepuptodate  ..\server /usr/local/www/256pixels.net/server"


:End
