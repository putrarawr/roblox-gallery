FROM node:22-alpine

WORKDIR /app

# Copy backend dependencies
COPY backend/package*.json ./
RUN npm install

# Copy backend source code
COPY backend ./

# Build TypeScript code
RUN npm run build

EXPOSE 4000

ENV PORT=4000
ENV HOST=0.0.0.0

CMD ["npm", "start"]
