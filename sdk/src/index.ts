export { GatewayClient } from './client.js';
export { IntentBuilder, createCommitment } from './intent.js';
export { encryptIntentForGateway } from './crypto.js';
export { ValidationError, NetworkError } from './errors.js';
export type {
  Intent,
  IntentCommitment,
  EncryptedIntent,
  PrivacyMode,
  SubmitIntentRequest,
  SubmitIntentResponse,
  IntentStatusResponse,
  BatchListItem,
  GatewayClientConfig,
} from './types.js';
