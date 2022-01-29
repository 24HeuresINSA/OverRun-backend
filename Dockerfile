FROM node:16.13.1-alpine3.14

WORKDIR /usr/app

COPY . .

RUN npm install &&\
    npm cache --force clean

WORKDIR /usr/app/src

CMD ["npm", "run", "start"]
