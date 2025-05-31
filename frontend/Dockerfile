FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package*.json ./
RUN pnpm install

# Copy application source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# THIRD_EDIT: Start Vite dev server using pnpm
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0"]
