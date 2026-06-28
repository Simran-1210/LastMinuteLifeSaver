FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDG0fsME4HZHM1EaHWbVmgTQ-wnBm9k_Sk
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=last-minute-lifesaver-c10c4.firebaseapp.com
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=last-minute-lifesaver-c10c4
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=last-minute-lifesaver-c10c4.firebasestorage.app
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=420350666958
ENV NEXT_PUBLIC_FIREBASE_APP_ID=1:420350666958:web:13e3137fe1d7f28acc089f
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]