import type { OstStatus } from './data'

const GREY = 'bg-gray-100 text-gray-700 ring-gray-300'
const AMBER = 'bg-amber-100 text-amber-800 ring-amber-300'
const GREEN = 'bg-green-100 text-green-800 ring-green-300'
const RED = 'bg-red-100 text-red-800 ring-red-300'

export function statusChipClasses(status: OstStatus): string {
  switch (status) {
    case 'open':
    case 'hypothesis':
    case 'planned':
      return GREY
    case 'running':
      return AMBER
    case 'validated':
    case 'complete':
      return GREEN
    case 'invalidated':
      return RED
  }
}

export const STATUS_LABELS: Record<OstStatus, string> = {
  open: 'open',
  validated: 'validated',
  invalidated: 'invalidated',
  hypothesis: 'hypothesis',
  planned: 'planned',
  running: 'running',
  complete: 'complete',
}
