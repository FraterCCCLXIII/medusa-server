FROM node:20-alpine

WORKDIR /app

# Configure yarn for better network resilience (5 minute timeout)
RUN yarn config set network-timeout 300000

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies with increased timeout
RUN yarn install --frozen-lockfile --production=false --network-timeout 300000

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Expose port
EXPOSE 9000

# Start the application
CMD ["yarn", "start"]

