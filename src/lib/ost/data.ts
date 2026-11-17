export type OstStatus =
  | 'open'
  | 'validated'
  | 'invalidated'
  | 'hypothesis'
  | 'planned'
  | 'running'
  | 'complete'

export type TeamId = 'primary' | 'secondary' | 'teacher' | 'platform'

// Fixed team order: drives column ordering, derived team sets and filter buttons.
export const TEAM_ORDER: TeamId[] = ['primary', 'secondary', 'teacher', 'platform']

export interface Insight {
  id: string
  label: string
  href: string
}

export interface Experiment {
  id: string
  title: string
  status: 'planned' | 'running' | 'complete'
  insights?: Insight[]
}

export interface Solution {
  id: string
  title: string
  status: 'hypothesis' | 'validated' | 'invalidated'
  /** IDs of experiments (in EXPERIMENTS) that test this solution. */
  experiments: string[]
}

export interface Opportunity {
  id: string
  title: string
  status: 'open' | 'validated' | 'invalidated'
  /** IDs of solutions (in SOLUTIONS) that address this opportunity. */
  solutions: string[]
}

export interface Team {
  id: TeamId
  name: string
  outcome: string
  opportunities: Opportunity[]
}

// Experiments and solutions are defined once and referenced by ID, so one node can serve
// several teams. Which teams a node serves is derived in graph.ts, never stored here.
export const EXPERIMENTS: Record<string, Experiment> = {
  'learn-exp-p01': { id: 'learn-exp-p01', title: 'A/B test: reminder email vs none', status: 'running' },
  'learn-exp-p02': { id: 'learn-exp-p02', title: 'Readability score comparison', status: 'complete' },
  'learn-exp-s01': { id: 'learn-exp-s01', title: 'Draft feature pilot with one cohort', status: 'planned' },
  'learn-exp-t01': { id: 'learn-exp-t01', title: 'Time-on-task study with 10 teachers', status: 'complete' },
  'learn-exp-t02': { id: 'learn-exp-t02', title: 'Digest pilot with volunteer teachers', status: 'running' },
  'learn-exp-pl01': { id: 'learn-exp-pl01', title: 'Cache pilot on 10% of traffic', status: 'running' },
  'learn-exp-pl02': { id: 'learn-exp-pl02', title: 'Reserved instance 1-week trial', status: 'complete' },
  'learn-exp-x01': { id: 'learn-exp-x01', title: 'Re-engagement cohort study', status: 'planned' },
}

export const SOLUTIONS: Record<string, Solution> = {
  'learn-sol-p01': {
    id: 'learn-sol-p01',
    title: 'Daily streak reminder',
    status: 'hypothesis',
    experiments: ['learn-exp-p01', 'learn-exp-x01'],
  },
  'learn-sol-p02': {
    id: 'learn-sol-p02',
    title: 'Simplified language + illustrations',
    status: 'validated',
    experiments: ['learn-exp-p02'],
  },
  'learn-sol-s01': {
    id: 'learn-sol-s01',
    title: 'Draft save with progress indicator',
    status: 'hypothesis',
    experiments: ['learn-exp-s01'],
  },
  'learn-sol-s02': {
    id: 'learn-sol-s02',
    title: 'Teacher-set priority badges on assignments',
    status: 'hypothesis',
    experiments: [],
  },
  'learn-sol-t01': {
    id: 'learn-sol-t01',
    title: 'Template library with one-click scaffolding',
    status: 'validated',
    experiments: ['learn-exp-t01'],
  },
  'learn-sol-t02': {
    id: 'learn-sol-t02',
    title: 'Weekly at-risk digest email',
    status: 'hypothesis',
    experiments: ['learn-exp-t02', 'learn-exp-x01'],
  },
  'learn-sol-pl01': {
    id: 'learn-sol-pl01',
    title: 'Edge-cached lesson content',
    status: 'hypothesis',
    experiments: ['learn-exp-pl01'],
  },
  'learn-sol-pl02': {
    id: 'learn-sol-pl02',
    title: 'Warm instance reservation',
    status: 'invalidated',
    experiments: ['learn-exp-pl02'],
  },
}

export const OST_TEAMS: Team[] = [
  {
    id: 'primary',
    name: 'Primary',
    outcome: '90% of primary students complete their first module within a week',
    opportunities: [
      {
        id: 'learn-opp-p01',
        title: "Students don't return after day 1",
        status: 'open',
        // learn-sol-t02: an early-warning digest helps teachers re-engage drop-offs.
        // learn-sol-pl01: slow first loads contribute to day-1 drop-off.
        solutions: ['learn-sol-p01', 'learn-sol-t02', 'learn-sol-pl01'],
      },
      {
        id: 'learn-opp-p02',
        title: 'Module instructions too complex for young readers',
        status: 'validated',
        solutions: ['learn-sol-p02'],
      },
    ],
  },
  {
    id: 'secondary',
    name: 'Secondary',
    outcome: 'Increase secondary student assignment completion rate to 80%',
    opportunities: [
      {
        id: 'learn-opp-s01',
        title: 'Students submit assignments at the last minute without review',
        status: 'open',
        solutions: ['learn-sol-s01'],
      },
      {
        id: 'learn-opp-s02',
        title: "Students can't tell which assignments are highest priority",
        status: 'open',
        solutions: ['learn-sol-s02'],
      },
    ],
  },
  {
    id: 'teacher',
    name: 'Teacher',
    outcome: 'Teachers create their first lesson plan in under 10 minutes',
    opportunities: [
      {
        id: 'learn-opp-t01',
        title: 'Teachers spend too long formatting lesson plans',
        status: 'validated',
        solutions: ['learn-sol-t01'],
      },
      {
        id: 'learn-opp-t02',
        title: "Teachers can't see which students are struggling until it's too late",
        status: 'open',
        solutions: ['learn-sol-t02', 'learn-sol-s02'],
      },
    ],
  },
  {
    id: 'platform',
    name: 'Platform',
    outcome: 'p99 response time under 100ms for all core student journeys',
    opportunities: [
      {
        id: 'learn-opp-pl01',
        title: 'Lesson load time spikes during morning peak',
        status: 'open',
        solutions: ['learn-sol-pl01'],
      },
      {
        id: 'learn-opp-pl02',
        title: 'Login page cold-start latency above SLA',
        status: 'invalidated',
        solutions: ['learn-sol-pl02'],
      },
    ],
  },
]

export const TEAM_NAMES: Record<TeamId, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  teacher: 'Teacher',
  platform: 'Platform',
}

// Full static class strings so Tailwind's JIT keeps them.
export const TEAM_ACCENTS: Record<
  TeamId,
  { border: string; bg: string; text: string; dot: string; stroke: string; ring: string }
> = {
  primary: {
    border: 'border-indigo-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
    stroke: 'stroke-indigo-500',
    ring: 'ring-indigo-500',
  },
  secondary: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    stroke: 'stroke-emerald-500',
    ring: 'ring-emerald-500',
  },
  teacher: {
    border: 'border-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    stroke: 'stroke-amber-500',
    ring: 'ring-amber-500',
  },
  platform: {
    border: 'border-sky-500',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
    stroke: 'stroke-sky-500',
    ring: 'ring-sky-500',
  },
}
