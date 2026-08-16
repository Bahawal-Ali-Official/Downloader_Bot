FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg python3
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
