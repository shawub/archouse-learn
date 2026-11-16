export type OstStatus =
  | 'open'
  | 'validated'
  | 'invalidated'
  | 'hypothesis'
  | 'planned'
  | 'running'
  | 'complete'

export type TeamId = 'primary' | 'secondary' | 'teacher' | 'platform'

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
  experiments: Experiment[]
}

export interface Opportunity {
  id: string
  title: string
  status: 'open' | 'validated' | 'invalidated'
  solutions: Solution[]
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
        solutions: [
          {
            id: 'learn-sol-p01',
            title: 'Daily streak reminder',
            status: 'hypothesis',
            experiments: [
              { id: 'learn-exp-p01', title: 'A/B test: reminder email vs none', status: 'running' },
            ],
          },
        ],
      },
      {
        id: 'learn-opp-p02',
        title: 'Module instructions too complex for young readers',
        status: 'validated',
        solutions: [
          {
            id: 'learn-sol-p02',
            title: 'Simplified language + illustrations',
            status: 'validated',
            experiments: [
              { id: 'learn-exp-p02', title: 'Readability score comparison', status: 'complete' },
            ],
          },
        ],
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
        solutions: [
          {
            id: 'learn-sol-s01',
            title: 'Draft save with progress indicator',
            status: 'hypothesis',
            experiments: [
              { id: 'learn-exp-s01', title: 'Draft feature pilot with one cohort', status: 'planned' },
            ],
          },
        ],
      },
      {
        id: 'learn-opp-s02',
        title: "Students can't tell which assignments are highest priority",
        status: 'open',
        solutions: [
          {
            id: 'learn-sol-s02',
            title: 'Teacher-set priority badges on assignments',
            status: 'hypothesis',
            experiments: [],
          },
        ],
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
        solutions: [
          {
            id: 'learn-sol-t01',
            title: 'Template library with one-click scaffolding',
            status: 'validated',
            experiments: [
              { id: 'learn-exp-t01', title: 'Time-on-task study with 10 teachers', status: 'complete' },
            ],
          },
        ],
      },
      {
        id: 'learn-opp-t02',
        title: "Teachers can't see which students are struggling until it's too late",
        status: 'open',
        solutions: [
          {
            id: 'learn-sol-t02',
            title: 'Weekly at-risk digest email',
            status: 'hypothesis',
            experiments: [
              { id: 'learn-exp-t02', title: 'Digest pilot with volunteer teachers', status: 'running' },
            ],
          },
        ],
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
        solutions: [
          {
            id: 'learn-sol-pl01',
            title: 'Edge-cached lesson content',
            status: 'hypothesis',
            experiments: [
              { id: 'learn-exp-pl01', title: 'Cache pilot on 10% of traffic', status: 'running' },
            ],
          },
        ],
      },
      {
        id: 'learn-opp-pl02',
        title: 'Login page cold-start latency above SLA',
        status: 'invalidated',
        solutions: [
          {
            id: 'learn-sol-pl02',
            title: 'Warm instance reservation',
            status: 'invalidated',
            experiments: [
              { id: 'learn-exp-pl02', title: 'Reserved instance 1-week trial', status: 'complete' },
            ],
          },
        ],
      },
    ],
  },
]

// Full static class strings so Tailwind's JIT keeps them.
export const TEAM_ACCENTS: Record<TeamId, { border: string; bg: string; text: string; dot: string }> = {
  primary: { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  secondary: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  teacher: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  platform: { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
}
