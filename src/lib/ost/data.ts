export type OstStatus =
  | 'open'
  | 'validated'
  | 'invalidated'
  | 'hypothesis'
  | 'planned'
  | 'running'
  | 'complete'

export type TeamId = 'primary' | 'secondary' | 'teacher' | 'platform'

export const TEAM_ORDER: TeamId[] = ['primary', 'secondary', 'teacher', 'platform']

export interface Insight {
  id: string
  label: string
  href: string
}

// Solutions and experiments are defined once and referenced by ID, so the same
// node can serve several teams. Team membership is derived (see graph.ts), never stored.
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
  experimentIds: string[]
}

export interface Opportunity {
  id: string
  title: string
  status: 'open' | 'validated' | 'invalidated'
  solutionIds: string[]
}

export interface Team {
  id: TeamId
  name: string
  outcome: string
  opportunities: Opportunity[]
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
        solutionIds: ['learn-sol-p01', 'learn-sol-t02', 'learn-sol-pl01'],
      },
      {
        id: 'learn-opp-p02',
        title: 'Module instructions too complex for young readers',
        status: 'validated',
        solutionIds: ['learn-sol-p02'],
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
        solutionIds: ['learn-sol-s01'],
      },
      {
        id: 'learn-opp-s02',
        title: "Students can't tell which assignments are highest priority",
        status: 'open',
        solutionIds: ['learn-sol-s02'],
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
        solutionIds: ['learn-sol-t01'],
      },
      {
        id: 'learn-opp-t02',
        title: "Teachers can't see which students are struggling until it's too late",
        status: 'open',
        solutionIds: ['learn-sol-t02', 'learn-sol-s02'],
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
        solutionIds: ['learn-sol-pl01'],
      },
      {
        id: 'learn-opp-pl02',
        title: 'Login page cold-start latency above SLA',
        status: 'invalidated',
        solutionIds: ['learn-sol-pl02'],
      },
    ],
  },
]

export const SOLUTIONS: Record<string, Solution> = {
  'learn-sol-p01': {
    id: 'learn-sol-p01',
    title: 'Daily streak reminder',
    status: 'hypothesis',
    experimentIds: ['learn-exp-p01', 'learn-exp-x01'],
  },
  'learn-sol-p02': {
    id: 'learn-sol-p02',
    title: 'Simplified language + illustrations',
    status: 'validated',
    experimentIds: ['learn-exp-p02'],
  },
  'learn-sol-s01': {
    id: 'learn-sol-s01',
    title: 'Draft save with progress indicator',
    status: 'hypothesis',
    experimentIds: ['learn-exp-s01'],
  },
  'learn-sol-s02': {
    id: 'learn-sol-s02',
    title: 'Teacher-set priority badges on assignments',
    status: 'hypothesis',
    experimentIds: [],
  },
  'learn-sol-t01': {
    id: 'learn-sol-t01',
    title: 'Template library with one-click scaffolding',
    status: 'validated',
    experimentIds: ['learn-exp-t01'],
  },
  'learn-sol-t02': {
    id: 'learn-sol-t02',
    title: 'Weekly at-risk digest email',
    status: 'hypothesis',
    experimentIds: ['learn-exp-t02', 'learn-exp-x01'],
  },
  'learn-sol-pl01': {
    id: 'learn-sol-pl01',
    title: 'Edge-cached lesson content',
    status: 'hypothesis',
    experimentIds: ['learn-exp-pl01'],
  },
  'learn-sol-pl02': {
    id: 'learn-sol-pl02',
    title: 'Warm instance reservation',
    status: 'invalidated',
    experimentIds: ['learn-exp-pl02'],
  },
}

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

// Full static class strings so Tailwind's JIT keeps them.
export const TEAM_ACCENTS: Record<TeamId, { border: string; bg: string; text: string; dot: string }> = {
  primary: { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  secondary: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  teacher: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  platform: { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
}

// SVG edge strokes: the Tailwind 500 shade of each team accent.
export const EDGE_ACCENTS: Record<TeamId, string> = {
  primary: '#6366f1',
  secondary: '#10b981',
  teacher: '#f59e0b',
  platform: '#0ea5e9',
}

export const TEAM_NAMES: Record<TeamId, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  teacher: 'Teacher',
  platform: 'Platform',
}
