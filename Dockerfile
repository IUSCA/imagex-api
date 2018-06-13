FROM node

WORKDIR /opt/sca/new-api

# Install app dependencies
COPY package.json .

RUN npm install
RUN npm install -g apidoc
RUN npm install passport passport-local mongoose passport-local-mongoose --save

COPY . .

EXPOSE 12809

CMD npm run apidoc && npm start