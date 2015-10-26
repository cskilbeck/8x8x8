WinSCP /script=sync.scp /parameter // %CD%\.. %1 %2

start /b WinSCP /loglevel=1 /command "open "%1"" "lcd %CD%" "option batch continue" "keepuptodate ..\public_html /usr/local/www/%2/public_html"
start /b WinSCP /loglevel=1 /command "open "%1"" "lcd %CD%" "option batch continue" "keepuptodate  ..\server /usr/local/www/%2/server"
