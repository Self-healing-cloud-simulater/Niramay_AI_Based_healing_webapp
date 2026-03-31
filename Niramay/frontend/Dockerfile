FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN rm -f package-lock.json && npm install

# Copy source files only (not node_modules)
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]
