import type { OstStatus } from '@/lib/ost/data'
import { STATUS_LABELS, statusChipClasses } from '@/lib/ost/status'

export function StatusChip({ status }: { status: OstStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusChipClasses(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
