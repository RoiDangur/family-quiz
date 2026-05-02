FROM node:20-slim

WORKDIR /app

# Copy everything first
COPY . .

# Install server deps
RUN cd server && npm install

# Install client deps and build
RUN cd client && npm install && npm run build

# Create data/uploads directories
RUN mkdir -p server/data server/uploads/images server/uploads/audio

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "server/index.js"]
