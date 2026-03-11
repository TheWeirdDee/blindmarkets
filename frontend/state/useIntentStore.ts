import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type IntentDraft = {
  assetIn: string;
  assetOut: string;
  amount: string;
  minOutput: string;
  maxFeeBps: number;
  deadlineMinutes: number;
  privacyMode: 'public' | 'hidden-amount' | 'hidden-direction';
};

type IntentState = {
  draft: IntentDraft;
  setDraft: (draft: Partial<IntentDraft>) => void;
  walletAddress: string;
  walletProviderKey: 'starknet' | 'starknet_braavos' | 'starknet_argentX' | null;
  setWalletSession: (
    address: string,
    providerKey: 'starknet' | 'starknet_braavos' | 'starknet_argentX'
  ) => void;
  clearWalletSession: () => void;
};

const FALLBACK_MAX_INTENT_DEADLINE_SECONDS = 120;

function parseNumberEnv(name: string): number {
  const value = process.env[name];
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveMaxIntentDeadlineSeconds(): number {
  const configured = Math.floor(parseNumberEnv('NEXT_PUBLIC_MAX_INTENT_DEADLINE_SECONDS'));
  if (configured > 0) {
    return configured;
  }
  return FALLBACK_MAX_INTENT_DEADLINE_SECONDS;
}

export const MAX_INTENT_DEADLINE_SECONDS = resolveMaxIntentDeadlineSeconds();
export const MAX_INTENT_DEADLINE_MINUTES = Math.max(1, Math.floor(MAX_INTENT_DEADLINE_SECONDS / 60));

function normalizeDeadlineMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return MAX_INTENT_DEADLINE_MINUTES;
  }
  if (value <= 0) {
    return 0;
  }
  return Math.min(MAX_INTENT_DEADLINE_MINUTES, Math.floor(value));
}

function resolveDefaultDeadlineMinutes(): number {
  const configured = normalizeDeadlineMinutes(parseNumberEnv('NEXT_PUBLIC_DEFAULT_DEADLINE_MINUTES'));
  if (configured > 0) {
    return configured;
  }
  return MAX_INTENT_DEADLINE_MINUTES;
}

function sanitizeIntentDraft(draft?: Partial<IntentDraft>): IntentDraft {
  return {
    assetIn: draft?.assetIn ?? defaultDraft.assetIn,
    assetOut: draft?.assetOut ?? defaultDraft.assetOut,
    amount: draft?.amount ?? defaultDraft.amount,
    minOutput: draft?.minOutput ?? defaultDraft.minOutput,
    maxFeeBps: draft?.maxFeeBps ?? defaultDraft.maxFeeBps,
    deadlineMinutes: normalizeDeadlineMinutes(draft?.deadlineMinutes ?? defaultDraft.deadlineMinutes),
    privacyMode: draft?.privacyMode ?? defaultDraft.privacyMode,
  };
}

const defaultDraft: IntentDraft = {
  assetIn: process.env.NEXT_PUBLIC_DEFAULT_ASSET_IN ?? '',
  assetOut: process.env.NEXT_PUBLIC_DEFAULT_ASSET_OUT ?? '',
  amount: process.env.NEXT_PUBLIC_DEFAULT_AMOUNT ?? '',
  minOutput: process.env.NEXT_PUBLIC_DEFAULT_MIN_OUTPUT ?? '',
  maxFeeBps: parseNumberEnv('NEXT_PUBLIC_DEFAULT_MAX_FEE_BPS'),
  deadlineMinutes: resolveDefaultDeadlineMinutes(),
  privacyMode: (process.env.NEXT_PUBLIC_DEFAULT_PRIVACY_MODE as IntentDraft['privacyMode']) ?? 'public'
};

export const useIntentStore = create<IntentState>()(
  persist(
    (set) => ({
      draft: defaultDraft,
      setDraft: (draft) => set((state) => ({
        draft: sanitizeIntentDraft({ ...state.draft, ...draft })
      })),
      walletAddress: '',
      walletProviderKey: null,
      setWalletSession: (address, providerKey) => set(() => ({
        walletAddress: address,
        walletProviderKey: providerKey,
      })),
      clearWalletSession: () => set(() => ({
        walletAddress: '',
        walletProviderKey: null,
      })),
    }),
    {
      name: 'blindmarkets-intent-store',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<IntentState> | undefined;
        return {
          ...currentState,
          ...persisted,
          draft: sanitizeIntentDraft(persisted?.draft),
        };
      },
      partialize: (state) => ({
        draft: state.draft,
        walletAddress: state.walletAddress,
        walletProviderKey: state.walletProviderKey,
      }),
    }
  )
);
