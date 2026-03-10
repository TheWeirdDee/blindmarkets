FROM rust:1.85-bookworm AS builder

WORKDIR /app

COPY backend/coordinator /app/backend/coordinator

RUN if [ -f /app/backend/coordinator/Cargo.lock ]; then \
      cargo build --release --manifest-path /app/backend/coordinator/Cargo.toml --locked; \
    else \
      cargo build --release --manifest-path /app/backend/coordinator/Cargo.toml; \
    fi

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/backend/coordinator/target/release/blindmarkets-coordinator /usr/local/bin/blindmarkets-coordinator

CMD ["blindmarkets-coordinator"]
