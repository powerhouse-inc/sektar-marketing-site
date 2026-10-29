# syntax=docker/dockerfile:1

# The Sektar site as a self-contained Next.js server (output: "standalone").
#
#   docker build -t sektar-marketing-site .
#   docker run --rm -p 3000:3000 sektar-marketing-site
#
# NEXT_PUBLIC_* values are inlined at build time: pass them as --build-arg, not
# at `docker run`. The defaults are production.

ARG NODE_VERSION=24

# ------------------------------------------------------------------ build
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Install scripts only build the e2e switchboard's native deps (ph-cli); the
# site needs none.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

ARG NEXT_PUBLIC_SITE_URL=https://sektar.io
ARG NEXT_PUBLIC_RENOWN_APP_NAME=sektar-site
ARG NEXT_PUBLIC_RENOWN_LOGIN_MODE=redirect
ARG NEXT_PUBLIC_RENOWN_URL=https://www.renown.id
ARG NEXT_PUBLIC_RENOWN_SWITCHBOARD_URL=https://switchboard.renown.vetra.io/graphql
ARG NEXT_PUBLIC_RENOWN_CHAIN_ID=1
ARG NEXT_PUBLIC_PORTLE_URL_TEMPLATE=https://app.{zone}/
ARG NEXT_PUBLIC_CLOUD_URL_TEMPLATE=https://{name}.vetra.io/
ARG NEXT_PUBLIC_DIRECTORY_URL=https://switchboard.vetra.io/api/@powerhousedao/vetra-cloud-package/apps/directory
ARG NEXT_PUBLIC_DIRECTORY_APP=43622402-be06-435a-bbfa-bb649b0d6244
ARG NEXT_PUBLIC_FREE_URL=https://calm-bat-b4qzzqbb-connect.vetra.io/
ARG NEXT_PUBLIC_DOWNLOAD_URL=https://github.com/powerhouse-inc/sektar/releases/latest
ARG NEXT_PUBLIC_VETRA_GRAPHQL_URL=https://switchboard.vetra.io/graphql

COPY . .
RUN pnpm build \
 && node scripts/check-bundle.mjs .next "$NEXT_PUBLIC_RENOWN_LOGIN_MODE"

# ------------------------------------------------------------------ run
FROM node:${NODE_VERSION}-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The standalone server, its static assets, the vendored design system, and
# the page's sections, which it reads at request time (lib/site-html.ts).
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/content ./content

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/robots.txt').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "server.js"]
