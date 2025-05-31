FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package*.json ./
RUN pnpm install

# Copy application source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

CMD ["pnpm", "run", "dev", "--", "--host", "localhost:5173"]
