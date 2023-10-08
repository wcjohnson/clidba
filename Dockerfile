FROM node:18

WORKDIR /usr/src/clidba

COPY dist/index.mjs .
COPY dist/index.mjs.map .
COPY src/clidba.sh ./clidba
RUN chmod +x clidba

