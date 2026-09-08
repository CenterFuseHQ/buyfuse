FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY packages ./packages
COPY src ./src
RUN npm ci --ignore-scripts && npm run build
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3002
EXPOSE 3002
USER node
CMD ["node","dist/server.js"]
