FROM node:10.4 as BUILDER

ADD . /fruitmail-web

WORKDIR /fruitmail-web

RUN yarn
RUN yarn build

FROM nginx:1.15-alpine

# Copy site file
COPY --from=BUILDER /fruitmail-web/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD [ "nginx", "-g", "daemon off;" ]
