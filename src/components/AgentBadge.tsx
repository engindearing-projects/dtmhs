const TIER_STYLES = {
  anonymous: "bg-neutral-700 text-neutral-300",
  verified: "bg-blue-900/50 text-blue-400 border border-blue-800",
  trusted: "bg-amber-900/50 text-amber-400 border border-amber-800",
} as const;

const TIER_LABELS = {
  anonymous: "anon",
  verified: "verified",
  trusted: "trusted",
} as const;

export function AgentBadge({
  tier,
}: {
  tier: "anonymous" | "verified" | "trusted";
}) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-xs font-mono rounded ${TIER_STYLES[tier]}`}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}
