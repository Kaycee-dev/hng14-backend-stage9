FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Using tsx to run our TS worker securely. For production, consider compiling.
CMD ["npx", "tsx", "start-worker.ts"]
