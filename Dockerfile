FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy prisma schema before install so postinstall prisma generate finds it
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000
ENV NODE_ENV=production

# Build at startup so runtime env vars (DATABASE_URL etc.) are available during build
CMD ["sh", "-c", "pnpm build && pnpm start"]
