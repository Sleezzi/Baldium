FROM node:current-slim

WORKDIR /Docker/

COPY ./package.json ./builder.js ./tsconfig.json .
COPY ./src ./src

ENV BUILDER_SOURCE=/Docker/src
ENV BUILDER_DIST=/Docker/dist

RUN npm i
RUN node builder.js --minify
RUN rm builder.js tsconfig.json
RUN rm -r src

CMD ["node", "index.js"]