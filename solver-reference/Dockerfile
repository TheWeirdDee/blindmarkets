FROM rust:1.85-bookworm AS builder

WORKDIR /app

COPY solver-reference /app/solver-reference

RUN if [ -f /app/solver-reference/Cargo.lock ]; then \
      cargo build --release --manifest-path /app/solver-reference/Cargo.toml --locked; \
    else \
      cargo build --release --manifest-path /app/solver-reference/Cargo.toml; \
    fi

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/solver-reference/target/release/blindmarkets-solver /usr/local/bin/blindmarkets-solver

CMD ["blindmarkets-solver"]
