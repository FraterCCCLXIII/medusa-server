FROM node:20-alpine

WORKDIR /app

# Yarn network timeout
RUN yarn config set network-timeout 300000

# Copy package files first for caching
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile --production=false --network-timeout 300000

# Copy full source code
COPY . .

# ================================
# 🔥 Required for Medusa Admin Build
# ================================

# Set build-time environment variables (override in Coolify)
ARG MEDUSA_BACKEND_URL
ARG ADMIN_CORS

ENV MEDUSA_BACKEND_URL=${MEDUSA_BACKEND_URL}
ENV ADMIN_CORS=${ADMIN_CORS}

# ================================
# 🔥 Build backend + admin
# ================================
RUN yarn build

# Expose port Medusa uses
EXPOSE 9000

# Start Medusa
CMD ["yarn", "start"]
