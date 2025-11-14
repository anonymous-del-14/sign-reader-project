# backend/Dockerfile - production-style image
FROM node:18-bullseye

WORKDIR /app

# copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# copy app source
COPY . .

EXPOSE 5000

# run the server
CMD ["node", "server.js"]
