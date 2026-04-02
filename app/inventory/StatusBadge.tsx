import type { Status } from '@/types'

const BADGE: Record<Status, { label: string; className: string }> = {
  ok: { label: 'OK', className: 'bg-green-100 text-green-800' },
  moyen: { label: 'Moyen', className: 'bg-orange-100 text-orange-800' },
  ko: { label: 'KO', className: 'bg-red-100 text-red-800' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className } = BADGE[status] ?? BADGE.ko
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  )
}
