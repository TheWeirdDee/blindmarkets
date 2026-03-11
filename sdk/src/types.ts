export type PrivacyMode = 'PUBLIC' | 'HIDDEN_AMOUNT' | 'HIDDEN_DIRECTION_AND_AMOUNT';

export type Intent = {
  intentId: string;
  intentHash: string;
  userAddress: string;
  assetIn: string;
  assetOut: string;
  amount: bigint;
  amountCommitment: string;
  minOutput: bigint;
  maxFeeBps: number;
  deadline: bigint;
  privacyMode: PrivacyMode;
  nonce: string;
};

export type IntentCommitment = {
  intentId: string;
  intentHash: string;
  amountCommitment: string;
  minOutput: bigint;
  maxFeeBps: number;
  deadline: bigint;
  privacyMode: PrivacyMode;
  nonce: string;
};

export type EncryptedIntent = {
  ciphertextHex: string;
  clientPublicKeyHex: string;
  encryptedSessionKeyHex: string;
};

export type SubmitIntentRequest = {
  intent_id: string;
  user_address: string;
  ciphertext: string;
  encrypted_session_key: string;
  client_public_key: string;
  commitment: string;
  user_signature: string[];
  nonce: string;
  authorization_hash?: string;
  submission_mode?: string;
};

export type SubmitIntentResponse = {
  intent_id: string;
  batch_id: string | null;
  awaiting_user_transaction: boolean;
};

export type IntentStatusResponse = {
  intent_id: string;
  status: 'pending' | 'committed' | 'in_batch' | 'settled' | 'failed' | 'cancelled' | 'expired';
  batch_id: string | null;
  tx_hash: string | null;
};

export type BatchListItem = {
  batch_id: string;
  status: string;
  intent_count: number;
  opened_at: string;
  closed_at: string | null;
  settled_at: string | null;
};

export type GatewayClientConfig = {
  baseUrl: string;
  apiKeyHeader?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  retryJitterMs?: number;
};
