#!/usr/bin/env bash
# Проверка доступности всех ссылок справочников (запускать там, где открыт интернет).
node -e '
const fs=require("fs");const s=new Set();
for (const f of ["universities","events"]) for (const x of JSON.parse(fs.readFileSync(`data/${f}.json`,"utf8"))) for (const k of ["site","admissionUrl","eventsUrl","url"]) if (x[k]) s.add(x[k]);
console.log([...s].join("\n"));' | xargs -P 16 -I{} sh -c 'echo "$(curl -s -o /dev/null -L --max-time 15 -A "Mozilla/5.0" -w "%{http_code}" "{}") {}"' | sort
