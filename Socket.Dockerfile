FROM node:24.15.0-slim

WORKDIR /Docker/

COPY ./package.json ./builder.js ./tsconfig.json ./
COPY socket ./socket

ENV BUILDER_SOURCE="/Docker/socket"
ENV BUILDER_DIST="/Docker/dist"

RUN npm i
RUN node builder.js --minify
RUN rm builder.js tsconfig.json
RUN rm -r socket

CMD ["node", "dist/index.js"]