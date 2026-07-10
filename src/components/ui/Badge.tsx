type BadgeColor = 'green' | 'amber' | 'red' | 'cyan' | 'purple' | 'gray'

const colorMap: Record<BadgeColor, string> = {
  green: 'bg-[#ECFDF5] text-[#065F46]',
  amber: 'bg-[#FFFBEB] text-[#92400E]',
  red: 'bg-[#FEF2F2] text-[#991B1B]',
  cyan: 'bg-[#ECFEFF] text-[#0E7490]',
  purple: 'bg-[#F5F3FF] text-[#5B21B6]',
  gray: 'bg-[#F1F5F9] text-[#334155]'
}

export function Badge({ color, children }: { color: BadgeColor; children: React.ReactNode }) {
  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold inline-block ${colorMap[color]}`}>
      {children}
    </span>
  )
}
