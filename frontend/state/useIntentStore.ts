import { create } from 'zustand';

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
  setWalletAddress: (address: string) => void;
};

const defaultDraft: IntentDraft = {
  assetIn: process.env.NEXT_PUBLIC_DEFAULT_ASSET_IN ?? '',
  assetOut: process.env.NEXT_PUBLIC_DEFAULT_ASSET_OUT ?? '',
  amount: process.env.NEXT_PUBLIC_DEFAULT_AMOUNT ?? '',
  minOutput: process.env.NEXT_PUBLIC_DEFAULT_MIN_OUTPUT ?? '',
  maxFeeBps: parseNumberEnv('NEXT_PUBLIC_DEFAULT_MAX_FEE_BPS'),
  deadlineMinutes: parseNumberEnv('NEXT_PUBLIC_DEFAULT_DEADLINE_MINUTES'),
  privacyMode: (process.env.NEXT_PUBLIC_DEFAULT_PRIVACY_MODE as IntentDraft['privacyMode']) ?? 'public'
};

function parseNumberEnv(name: string): number {
  const value = process.env[name];
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const useIntentStore = create<IntentState>((set) => ({
  draft: defaultDraft,
  setDraft: (draft) => set((state) => ({
    draft: { ...state.draft, ...draft }
  })),
  walletAddress: '',
  setWalletAddress: (address) => set(() => ({ walletAddress: address }))
}));
