FROM node:18.20.8-slim
WORKDIR /app

# Copy package files first for better caching
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install

# Then copy the rest of the application
COPY . .

# Build the React app
RUN npm run build

# Install serve globally
RUN npm install -g serve

EXPOSE 3000
CMD ["serve", "-s", "build", "-p", "3000"]