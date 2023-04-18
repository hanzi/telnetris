FROM node

COPY telnetris.js /
RUN chmod -v +x /telnetris.js
EXPOSE 23

ENTRYPOINT [ "/telnetris.js" ]
