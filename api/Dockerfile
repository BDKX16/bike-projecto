FROM node:18-alpine

WORKDIR /api

COPY package.json .

RUN npm install

COPY . .


EXPOSE 3001

# Usar script de inicialización que verifica OpenSSL
CMD ["node", "index.js"]

