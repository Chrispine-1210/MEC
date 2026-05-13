FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY Admin/package.json Admin/package-lock.json ./Admin/
RUN npm ci
RUN npm ci --prefix ./Admin

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/uploads ./uploads

EXPOSE 5000

CMD ["node", "dist/index.js"]
