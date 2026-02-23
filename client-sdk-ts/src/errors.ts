export class SdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SdkError';
  }
}

export class ValidationError extends SdkError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CryptoError extends SdkError {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

export class NetworkError extends SdkError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}
