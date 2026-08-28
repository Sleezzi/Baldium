# syntax=docker/dockerfile:1

FROM node:24.15.0-slim AS base
WORKDIR /app

FROM base AS deps
ARG SERVICE_NAME
COPY package.json package-lock.json ./
COPY packages packages
COPY services/${SERVICE_NAME}/package.json services/${SERVICE_NAME}/package.json
RUN npm ci --workspace=@baldium/${SERVICE_NAME} --include-workspace-root

FROM deps AS build
ARG SERVICE_NAME
COPY tsconfig.base.json ./
COPY services/${SERVICE_NAME} services/${SERVICE_NAME}
RUN npm run build --workspace=@baldium/shared-types
RUN npm run build --workspace=@baldium/${SERVICE_NAME}

FROM node:24.15.0-slim AS runtime
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY services/${SERVICE_NAME}/package.json services/${SERVICE_NAME}/package.json
RUN npm ci --workspace=@baldium/${SERVICE_NAME} --include-workspace-root --omit=dev
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=build /app/services/${SERVICE_NAME}/dist services/${SERVICE_NAME}/dist
USER node
CMD ["sh", "-c", "node services/$SERVICE_NAME/dist/index.js"]