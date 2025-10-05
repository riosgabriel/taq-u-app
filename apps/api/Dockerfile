FROM node:20.11.1-alpine

# Set working directory
WORKDIR /usr/src/app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Expose port
EXPOSE 3000

# Set default command
CMD ["pnpm", "run", "dev"]