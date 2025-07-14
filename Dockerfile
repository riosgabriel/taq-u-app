FROM node:20.11.1-alpine

WORKDIR /usr/src/app

# COPY .npmrc ./
COPY package.json ./
COPY pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@8.15.4 --activate && pnpm install

COPY . .

CMD ["pnpm", "run", "dev"]