@echo off


WinSCP /script=sync.scp /parameter // %CD%\.. DigitalOcean 

start /b WinSCP /command "open DigitalOcean" "lcd %CD%" "option batch continue" "keepuptodate ..\public_html /usr/local/www/256pixels.net/public_html"
start /b WinSCP /command "open DigitalOcean" "lcd %CD%" "option batch continue" "keepuptodate  ..\production /usr/local/www/256pixels.net/production"


:End
