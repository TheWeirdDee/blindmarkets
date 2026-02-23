use prometheus::{Encoder, IntCounter, Registry, TextEncoder, Histogram, HistogramOpts};
use std::sync::OnceLock;

pub struct Metrics {
    pub intents_submitted_total: IntCounter,
    pub intents_rejected_total: IntCounter,
    pub intents_onchain_failed_total: IntCounter,
    pub batches_closed_total: IntCounter,
    pub batches_failed_total: IntCounter,
    pub batches_settled_total: IntCounter,
    pub request_latency_seconds: Histogram,
}

static METRICS: OnceLock<Metrics> = OnceLock::new();
static REGISTRY: OnceLock<Registry> = OnceLock::new();

pub fn init_metrics() -> &'static Metrics {
    METRICS.get_or_init(|| {
        let registry = Registry::new();
        let intents_submitted_total = IntCounter::new(
            "gateway_intents_submitted_total",
            "Total number of intents successfully submitted",
        ).expect("counter");
        let intents_rejected_total = IntCounter::new(
            "gateway_intents_rejected_total",
            "Total number of intents rejected by validation or signature checks",
        ).expect("counter");
        let intents_onchain_failed_total = IntCounter::new(
            "gateway_intents_onchain_failed_total",
            "Total number of intents that failed on-chain commit",
        ).expect("counter");
        let batches_closed_total = IntCounter::new(
            "gateway_batches_closed_total",
            "Total number of batches closed",
        ).expect("counter");
        let batches_failed_total = IntCounter::new(
            "gateway_batches_failed_total",
            "Total number of batches marked failed",
        ).expect("counter");
        let batches_settled_total = IntCounter::new(
            "gateway_batches_settled_total",
            "Total number of batches settled",
        ).expect("counter");
        let request_latency_seconds = Histogram::with_opts(
            HistogramOpts::new(
                "gateway_request_latency_seconds",
                "Gateway request latency in seconds"
            )
        ).expect("histogram");

        registry.register(Box::new(intents_submitted_total.clone())).expect("register");
        registry.register(Box::new(intents_rejected_total.clone())).expect("register");
        registry.register(Box::new(intents_onchain_failed_total.clone())).expect("register");
        registry.register(Box::new(batches_closed_total.clone())).expect("register");
        registry.register(Box::new(batches_failed_total.clone())).expect("register");
        registry.register(Box::new(batches_settled_total.clone())).expect("register");
        registry.register(Box::new(request_latency_seconds.clone())).expect("register");

        REGISTRY.set(registry).ok();

        Metrics {
            intents_submitted_total,
            intents_rejected_total,
            intents_onchain_failed_total,
            batches_closed_total,
            batches_failed_total,
            batches_settled_total,
            request_latency_seconds,
        }
    })
}

pub fn gather_metrics() -> Result<String, String> {
    let registry = REGISTRY.get().ok_or_else(|| "Metrics registry not initialized".to_string())?;
    let metric_families = registry.gather();
    let mut buffer = Vec::new();
    let encoder = TextEncoder::new();
    encoder.encode(&metric_families, &mut buffer)
        .map_err(|e| format!("Metrics encode error: {}", e))?;
    String::from_utf8(buffer).map_err(|e| format!("Metrics utf8 error: {}", e))
}
