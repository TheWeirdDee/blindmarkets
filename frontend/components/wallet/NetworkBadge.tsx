type NetworkBadgeProps = {
  network?: string;
};

export default function NetworkBadge({ network = 'Starknet Sepolia' }: NetworkBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-text-secondary">
      <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
      {network}
    </span>
  );
}
