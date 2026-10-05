FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

EXPOSE 4000

ENV PORT=4000
ENV HOST=0.0.0.0

CMD ["npm", "start"]
