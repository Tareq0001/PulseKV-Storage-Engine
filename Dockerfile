FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY src/ ./src/
COPY tests/ ./tests/
RUN node tests/pulsekv.test.js
CMD ["node", "tests/pulsekv.test.js"]
