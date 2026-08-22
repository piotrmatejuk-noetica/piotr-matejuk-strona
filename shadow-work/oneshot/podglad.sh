#!/bin/bash
# Podglad oneshot hero — startuje serwer (jesli nie chodzi) i otwiera przegladarke.
# Uzycie:  ./podglad.sh        (albo: bash podglad.sh)
PORT=4173
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"   # katalog StronaPiotra
URL="http://localhost:$PORT/shadow-work/oneshot/"

if curl -s -o /dev/null "$URL"; then
  echo "Serwer juz chodzi na porcie $PORT."
else
  echo "Startuje serwer w $ROOT na porcie $PORT..."
  (cd "$ROOT" && nohup python3 -m http.server "$PORT" >/dev/null 2>&1 &)
  sleep 1.5
fi

echo "Otwieram $URL"
open "$URL"
echo "Zatrzymanie serwera:  pkill -f 'http.server $PORT'"
