FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Expose port
EXPOSE 9000

# Start the application
CMD ["yarn", "start"]

