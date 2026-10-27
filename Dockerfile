FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
ENV ENV=production \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/cogni \
    BETTER_AUTH_SECRET=build-only-secret-value-with-at-least-32-characters \
    BETTER_AUTH_URL=https://build.invalid \
    GOOGLE_CLIENT_ID=build-only \
    GOOGLE_CLIENT_SECRET=build-only \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runtime
RUN addgroup -S cogni && adduser -S -G cogni cogni
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/postcss.config.mjs ./postcss.config.mjs
RUN mkdir -p /app/.uploads && chown -R cogni:cogni /app/.next /app/.uploads
USER cogni
EXPOSE 3000
CMD ["pnpm", "start"]
