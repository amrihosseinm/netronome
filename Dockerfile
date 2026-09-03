# Railway Deployment Dockerfile for Netronome
# Stage 1: Build frontend
FROM node:lts-alpine3.22 AS web-builder

RUN npm install -g pnpm@9.9.0

WORKDIR /app/web
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY web/ ./
RUN pnpm run build

# Stage 2: Build backend
FROM golang:1.22-alpine AS app-builder

RUN apk add --no-cache git build-base ca-certificates

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . ./
COPY --from=web-builder /app/web/dist ./web/dist

ENV CGO_ENABLED=0 GOOS=linux
RUN go build -ldflags "-s -w" -o /app/netronome ./cmd/netronome

# Stage 3: Runtime
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata sqlite

WORKDIR /data

COPY --from=app-builder /app/netronome /usr/local/bin/netronome
COPY config/config.railway.toml /data/config.toml

# Railway injects PORT env var
ENV PORT=7575

EXPOSE 7575

CMD ["netronome", "serve", "--config", "/data/config.toml"]