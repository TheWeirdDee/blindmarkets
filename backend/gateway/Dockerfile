FROM rust:1.88-bookworm AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates postgresql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/gateway /app/backend/gateway
COPY scripts/build_gateway_with_schema.sh /app/scripts/build_gateway_with_schema.sh

RUN chmod +x /app/scripts/build_gateway_with_schema.sh \
    && /app/scripts/build_gateway_with_schema.sh /app/backend/gateway blindmarkets-gateway

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/backend/gateway/target/release/blindmarkets-gateway /usr/local/bin/blindmarkets-gateway

EXPOSE 3000

CMD ["blindmarkets-gateway"]
