FROM node:24.15.0-slim

WORKDIR /Docker/

COPY ./package.json ./builder.js ./tsconfig.json ./
COPY src ./src

ENV BUILDER_SOURCE="/Docker/src"
ENV BUILDER_DIST="/Docker/dist"

RUN npm i
RUN node builder.js --debug
RUN rm builder.js tsconfig.json
RUN rm -r src

CMD ["node", "dist/index.js"]