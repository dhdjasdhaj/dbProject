# Build official tagged MinIO sources because upstream public images are unavailable.
FROM golang:1.24.8-alpine AS minio-builder
RUN apk add --no-cache ca-certificates git
WORKDIR /src
ADD https://github.com/minio/minio/archive/refs/tags/RELEASE.2025-10-15T17-29-55Z.tar.gz /tmp/minio.tar.gz
RUN tar -xzf /tmp/minio.tar.gz --strip-components=1
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -p 2 -trimpath -o /out/minio .

FROM golang:1.24.8-alpine AS mc-builder
RUN apk add --no-cache ca-certificates git
WORKDIR /src
ADD https://github.com/minio/mc/archive/refs/tags/RELEASE.2025-08-13T08-35-41Z.tar.gz /tmp/mc.tar.gz
RUN tar -xzf /tmp/mc.tar.gz --strip-components=1
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -p 2 -trimpath -o /out/mc .

FROM alpine:3.22 AS server
RUN apk add --no-cache ca-certificates curl
COPY --from=minio-builder /out/minio /usr/local/bin/minio
EXPOSE 9000 9001
ENTRYPOINT ["minio"]

FROM alpine:3.22 AS client
RUN apk add --no-cache ca-certificates
COPY --from=mc-builder /out/mc /usr/local/bin/mc
ENTRYPOINT ["mc"]
