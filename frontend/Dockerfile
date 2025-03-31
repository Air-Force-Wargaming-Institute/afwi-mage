FROM node:18.20.8-slim
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
COPY . .
RUN npm install
RUN npm run build
RUN npm install -g serve
EXPOSE 8080
CMD ["serve", "-s", "build", "-p", "8080"]