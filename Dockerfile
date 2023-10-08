FROM node:18-alpine

WORKDIR /usr/src/clidba

COPY dist/index.mjs .
COPY dist/index.mjs.map .
COPY src/clidba.sh ./clidba
RUN chmod +x clidba

ENTRYPOINT [ "/usr/src/clidba/clidba" ]
CMD ["/clidba-conf/conf.json"]
