FROM node

WORKDIR /opt/sca/imagex-api

# Install app dependencies
COPY package.json .

RUN npm install

COPY . .

EXPOSE 3001

CMD [ "npm", "start" ]