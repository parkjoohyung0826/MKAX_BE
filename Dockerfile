FROM node:20-slim AS build

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]
