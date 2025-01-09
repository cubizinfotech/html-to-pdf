# Use Node.js as the base image
FROM node:18-slim

# Install Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    libnss3 \
    libxss1 \
    libasound2 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    libgbm1 \
    libgtk-3-0 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Ensure Puppeteer installs Chromium
RUN npx puppeteer install

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
