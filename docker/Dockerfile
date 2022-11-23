FROM node:alpine as build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn
COPY . .
RUN yarn build && yarn --production && yarn cache clean

FROM node:alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json .
EXPOSE 80
CMD ["yarn","start"]