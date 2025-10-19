# Usa una imagen ligera de Node.js
FROM node:18-alpine

# Crea el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Expón el puerto que usa tu app
EXPOSE 3000

# Comando por defecto para iniciar la app
CMD ["npm", "run", "start"]
