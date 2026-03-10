FROM rust:1.81-bookworm AS builder

WORKDIR /app

COPY backend/observer /app/backend/observer

RUN if [ -f /app/backend/observer/Cargo.lock ]; then \
      cargo build --release --manifest-path /app/backend/observer/Cargo.toml --locked; \
    else \
      cargo build --release --manifest-path /app/backend/observer/Cargo.toml; \
    fi

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/backend/observer/target/release/blindmarkets-observer /usr/local/bin/blindmarkets-observer

CMD ["blindmarkets-observer"]
