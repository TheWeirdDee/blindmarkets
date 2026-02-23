use blindmarkets_sdk::{
    IntentBuilder, PrivacyMode, GatewayClient, GatewayClientConfig, SubmitIntentRequest,
    intent_builder::create_commitment, encryption::encrypt_intent_for_gateway,
    signing::StarknetSigner,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Blind BTC Intent Markets - SDK Example\n");

    // 1. Build an intent
    println!("1️⃣  Building intent...");
    let user_address = std::env::var("SDK_USER_ADDRESS")
        .map_err(|_| "SDK_USER_ADDRESS is required")?;
    let asset_in = std::env::var("SDK_ASSET_IN")
        .map_err(|_| "SDK_ASSET_IN is required")?;
    let asset_out = std::env::var("SDK_ASSET_OUT")
        .map_err(|_| "SDK_ASSET_OUT is required")?;
    let amount: u128 = std::env::var("SDK_AMOUNT")
        .map_err(|_| "SDK_AMOUNT is required")?
        .parse()
        .map_err(|_| "SDK_AMOUNT must be a u128")?;
    let min_output: u128 = std::env::var("SDK_MIN_OUTPUT")
        .map_err(|_| "SDK_MIN_OUTPUT is required")?
        .parse()
        .map_err(|_| "SDK_MIN_OUTPUT must be a u128")?;
    let max_fee_bps: u16 = std::env::var("SDK_MAX_FEE_BPS")
        .map_err(|_| "SDK_MAX_FEE_BPS is required")?
        .parse()
        .map_err(|_| "SDK_MAX_FEE_BPS must be a u16")?;
    let deadline_seconds: u64 = std::env::var("SDK_DEADLINE_SECONDS")
        .map_err(|_| "SDK_DEADLINE_SECONDS is required")?
        .parse()
        .map_err(|_| "SDK_DEADLINE_SECONDS must be a u64")?;

    let intent = IntentBuilder::new()
        .user_address(user_address)
        .asset_in(asset_in)
        .asset_out(asset_out)
        .amount(amount)
        .min_output(min_output)
        .max_fee_bps(max_fee_bps)
        .deadline_seconds(deadline_seconds)
        .privacy_mode(PrivacyMode::HiddenAmount)
        .build()?;

    println!("   Intent ID: {}", intent.intent_id);
    println!("   Amount: {} (hidden)", intent.amount);
    println!("   Min Output: {}", intent.min_output);
    println!();

    // 2. Create commitment
    println!("2️⃣  Creating commitment...");
    let commitment = create_commitment(&intent)?;
    println!("   Intent Hash: {}", commitment.intent_hash);
    println!("   Amount Commitment: {}", commitment.amount_commitment);
    println!();

    // 3. Sign commitment
    println!("3️⃣  Signing commitment...");
    let private_key = std::env::var("STARKNET_PRIVATE_KEY")
        .map_err(|_| "STARKNET_PRIVATE_KEY is required")?;
    
    let signer = StarknetSigner::new(private_key);
    let signature = signer.sign_commitment(&commitment)?;
    println!("   Signature: [{}, {}]", signature[0], signature[1]);
    println!();

    // 4. Prepare gateway client
    println!("4️⃣  Preparing gateway client...");
    let gateway_url = std::env::var("GATEWAY_URL")
        .map_err(|_| "GATEWAY_URL is required")?;
    let api_key_header = std::env::var("GATEWAY_API_KEY_HEADER")
        .map_err(|_| "GATEWAY_API_KEY_HEADER is required")?;
    let api_key = std::env::var("GATEWAY_API_KEY")
        .map_err(|_| "GATEWAY_API_KEY is required")?;
    let timeout_seconds: u64 = std::env::var("GATEWAY_TIMEOUT_SECONDS")
        .map_err(|_| "GATEWAY_TIMEOUT_SECONDS is required")?
        .parse()
        .map_err(|_| "GATEWAY_TIMEOUT_SECONDS must be a u64")?;
    let max_retries: u32 = std::env::var("GATEWAY_MAX_RETRIES")
        .map_err(|_| "GATEWAY_MAX_RETRIES is required")?
        .parse()
        .map_err(|_| "GATEWAY_MAX_RETRIES must be a u32")?;
    let retry_base_delay_ms: u64 = std::env::var("GATEWAY_RETRY_BASE_DELAY_MS")
        .map_err(|_| "GATEWAY_RETRY_BASE_DELAY_MS is required")?
        .parse()
        .map_err(|_| "GATEWAY_RETRY_BASE_DELAY_MS must be a u64")?;
    let retry_max_delay_ms: u64 = std::env::var("GATEWAY_RETRY_MAX_DELAY_MS")
        .map_err(|_| "GATEWAY_RETRY_MAX_DELAY_MS is required")?
        .parse()
        .map_err(|_| "GATEWAY_RETRY_MAX_DELAY_MS must be a u64")?;
    let retry_jitter_ms: u64 = std::env::var("GATEWAY_RETRY_JITTER_MS")
        .map_err(|_| "GATEWAY_RETRY_JITTER_MS is required")?
        .parse()
        .map_err(|_| "GATEWAY_RETRY_JITTER_MS must be a u64")?;

    let client = GatewayClient::new(GatewayClientConfig {
        base_url: gateway_url.clone(),
        api_key_header,
        api_key,
        timeout_seconds,
        max_retries,
        retry_base_delay_ms,
        retry_max_delay_ms,
        retry_jitter_ms,
    })?;

    // 5. Encrypt intent
    println!("5️⃣  Encrypting intent for gateway...");
    let gateway_public_key_hex = match std::env::var("GATEWAY_PUBLIC_KEY") {
        Ok(value) => value,
        Err(_) => {
            let response = client.get_gateway_public_key().await?;
            response.gateway_public_key
        }
    };
    let gateway_public_key = hex::decode(gateway_public_key_hex.trim_start_matches("0x"))
        .map_err(|_| "GATEWAY_PUBLIC_KEY must be hex")?;
    let encrypted_payload = encrypt_intent_for_gateway(&intent, &gateway_public_key)?;
    println!("   Ciphertext length: {} bytes", encrypted_payload.ciphertext_hex.len() / 2);
    println!();

    // 6. Submit to gateway
    println!("6️⃣  Submitting to gateway...");
    // Check gateway health first
    match client.health_check().await {
        Ok(true) => println!("   Gateway is healthy ✓"),
        Ok(false) => {
            println!("   ⚠️  Gateway health check failed");
            return Ok(());
        }
        Err(e) => {
            println!("   ⚠️  Cannot reach gateway: {}", e);
            println!("   Make sure gateway is running: cd backend/gateway && cargo run");
            return Ok(());
        }
    }

    let request = SubmitIntentRequest {
        intent_id: intent.intent_id.clone(),
        user_address: intent.user_address.clone(),
        ciphertext: encrypted_payload.ciphertext_hex,
        encrypted_session_key: encrypted_payload.encrypted_session_key_hex,
        commitment: commitment.intent_hash.clone(),
        user_signature: signature,
        client_public_key: encrypted_payload.client_public_key_hex,
        nonce: intent.nonce.clone(),
    };

    match client.submit_intent(request).await {
        Ok(response) => {
            println!("   ✅ Intent submitted successfully!");
            println!("   Batch ID: {}", response.batch_id);
            println!("   Estimated execution: {}", response.estimated_execution_time);
            println!();

            // 7. Query status
            println!("7️⃣  Querying intent status...");
                match client.get_intent_status(&intent.intent_id).await {
                    Ok(status) => {
                        println!("   Status: {:?}", status);
                    }
                    Err(e) => {
                        println!("   Status query failed: {}", e);
                    }
            }
        }
        Err(e) => {
            println!("   ⚠️  Submission failed: {}", e);
            println!();
            println!("   This is expected if:");
            println!("   - Gateway is not running");
            println!("   - Signature verification fails");
            println!("   - Database is not configured");
            println!();
            println!("   To test with real gateway:");
            println!("   1. Start gateway: cd backend/gateway && cargo run");
            println!("   2. Set STARKNET_PRIVATE_KEY environment variable");
            println!("   3. Run this example again");
        }
    }

    println!();
    println!("🎉 Example complete!");
    println!();
    println!("📚 Next steps:");
    println!("   - Deploy contracts: ./scripts/deploy_contracts.sh");
    println!("   - Start coordinator: cd backend/coordinator && cargo run");
    println!("   - Monitor batches forming every 30 seconds");
    
    Ok(())
}
