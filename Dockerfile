FROM node:24-alpine

STOPSIGNAL SIGKILL

COPY telnetris.js /app/
EXPOSE 10023
USER nobody:nobody

CMD [ "/usr/local/bin/node", "/app/telnetris.js", "10023" ]
