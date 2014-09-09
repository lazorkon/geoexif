#!/bin/sh

# node can not start on port 80 because lower port numbers require root privileges
# solution: edit /etc/rc.local or /ect/rc.d/local and add following command without sudo
# sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8080


# # add start script cron
# crontab -e
# @reboot ~/start.sh >> cron.log 2>&1

if [ $(ps aux | grep $USER | grep node | grep -v grep | wc -l | tr -s "\n") -eq 0 ]; then
    export PORT=8080
    export NODE_ENV=production
    DATE=$(date +%Y-%m-%d_%H%M)
    LOG="./log/$DATE-forever.log"
    OUT_LOG="./log/$DATE-out.log"
    ERR_LOG="./log/$DATE-err.log"
    if cd $SCRIPT_PATH ; then
        if [[ ! -d log ]] ; then 
            mkdir log
        fi
        ./node_modules/.bin/forever --uid 'tagmazing' -m 5 --plain --no-colors --minUptime 1000 --spinSleepTime 10000 -p $(pwd) -l $LOG -o $OUT_LOG -e $ERR_LOG start server/app.js
    fi
fi
