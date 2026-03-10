export type PrivacyMode = 'PUBLIC' | 'HIDDEN_AMOUNT' | 'HIDDEN_DIRECTION_AND_AMOUNT';

export type Intent = {
  intentId: string;
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
  userAddress: string;
  intentHash: string;
  amountCommitment: string;
  minOutputCommitment: string;
  maxFeeBps: number;
  deadline: bigint;
  privacyMode: PrivacyMode;
  nonce: string;
};

export type SubmitIntentRequest = {
  intent_id: string;
  user_address: string;
  ciphertext: string;
  encrypted_session_key: string;
  commitment: string;
  user_signature: string[];
  client_public_key: string;
  nonce: string;
  authorization_hash?: string;
  submission_mode?: 'GATEWAY' | 'SELF_COMMIT';
};

export type SubmitIntentResponse = {
  intent_id: string;
  batch_id: string;
  estimated_execution_time: number;
  awaiting_user_transaction: boolean;
};

export type OnchainLifecycleRequest = {
  action: 'COMMITTED' | 'CANCELED';
  user_address: string;
  tx_hash: string;
};

export type GatewayPublicKeyResponse = {
  gateway_public_key: string;
};

export type IntentStatusResponse = {
  intent_id: string;
  status: string;
  batch_id?: string | null;
};

export type IntentListItem = {
  intent_id: string;
  user_address: string;
  status: string;
  batch_id: string;
  created_at: string;
};

export type IntentListResponse = {
  intents: IntentListItem[];
  limit: number;
  offset: number;
};

export type BatchListItem = {
  batch_id: string;
  close_time: number;
  intent_count: number;
  auction_deadline: number;
  status: string;
  created_at: string;
  settled_at?: string | null;
  failure_reason?: string | null;
  failed_at?: string | null;
};

export type BatchListResponse = {
  batches: BatchListItem[];
  limit: number;
  offset: number;
};

export type BatchIntentListResponse = {
  intent_ids: string[];
};
