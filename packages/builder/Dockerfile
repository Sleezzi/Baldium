FROM node:24.15.0-slim  AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/builder/package.json packages/builder/package.json
COPY services/api/package.json services/api/package.json
RUN npm ci --workspace=@baldium/shared-types --workspace=@baldium/builder --workspace=@baldium/api --include-workspace-root

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared-types packages/shared-types
COPY packages/builder packages/builder
COPY services/api services/api
RUN npm run build --workspace=@baldium/shared-types
RUN npm run build --workspace=@baldium/api

FROM node:24.15.0-slim  AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY services/api/package.json services/api/package.json
RUN npm ci --workspace=@baldium/shared-types --workspace=@baldium/api --include-workspace-root --omit=dev
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=build /app/services/api/dist services/api/dist
USER node
CMD ["node", "services/api/dist/index.js"]