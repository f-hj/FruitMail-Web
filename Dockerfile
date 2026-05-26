FROM node:24-alpine AS builder

WORKDIR /fruitmail-web

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install

COPY . .
RUN yarn build

FROM nginx:1.27-alpine

COPY --from=builder /fruitmail-web/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
