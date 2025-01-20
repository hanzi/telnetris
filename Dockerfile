FROM node:22-alpine

COPY telnetris.js /app/
EXPOSE 10023
USER nobody:nobody

CMD [ "/usr/local/bin/node", "/app/telnetris.js", "10023" ]
