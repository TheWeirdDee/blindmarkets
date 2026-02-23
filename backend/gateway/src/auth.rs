use serde::Serialize;
use starknet::core::utils::get_selector_from_name;

#[derive(Serialize)]
struct CallContractRequest<'a> {
    contract_address: &'a str,
    entry_point_selector: &'a str,
    calldata: Vec<String>,
}

pub async fn verify_signature(
    rpc_url: &str,
    user_address: &str,
    message_hash: &str,
    signature: &[String],
) -> Result<bool, String> {
    if signature.len() != 2 {
        return Err("Invalid signature length".to_string());
    }

    let selector = get_selector_from_name("is_valid_signature")
        .map_err(|e| format!("Selector error: {}", e))?;

    let calldata = vec![
        message_hash.to_string(),
        "0x2".to_string(),
        signature[0].clone(),
        signature[1].clone(),
    ];

    let request = CallContractRequest {
        contract_address: user_address,
        entry_point_selector: &format!("{selector:#x}"),
        calldata,
    };

    let response = reqwest::Client::new()
        .post(format!("{}/feeder_gateway/call_contract", rpc_url))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("RPC request failed: {}", e))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("RPC error: {}", body));
    }

    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("RPC parse error: {}", e))?;

    let is_valid = result["result"]
        .get(0)
        .and_then(|v| v.as_str())
        .map(|v| v != "0x0")
        .unwrap_or(false);

    Ok(is_valid)
}

pub fn extract_user_from_signature(signature: &[String]) -> Result<String, String> {
    Err("Cannot extract user from signature alone. User address must be provided separately.".to_string())
}

#[cfg(test)]
mod auth_tests;
