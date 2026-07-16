# syntax=docker/dockerfile:1

# Next.js(standalone) 프로덕션 이미지 — CI(GitHub Actions)에서 빌드해 GHCR 로 푸시한다.
# VM 은 이 이미지를 pull 만 하므로 VM 에서 무거운 빌드를 하지 않는다(OOM 회피).

# ---- 1) deps: lockfile 기준 결정적 설치 ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2) builder: standalone 산출물 생성 ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/ 이 없는 레포도 있으므로 항상 존재하도록 보장(아래 runner COPY 실패 방지)
RUN mkdir -p public
# NEXT_PUBLIC_* 는 빌드 시 번들에 인라인된다 → 배포 origin 을 build-arg 로 주입
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# ---- 3) runner: 최소 실행 이미지 ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# 루트가 아닌 전용 사용자로 실행
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
