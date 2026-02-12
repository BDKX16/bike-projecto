FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 3001

# Variable de entorno
ENV NODE_ENV=production

# Iniciar aplicación
CMD ["node", "index.js"]

