export type Status = 'ontrack' | 'blocked' | 'paused' | 'shipped' | 'planning'
export type Health = 'gold' | 'silver' | 'bronze'

export interface ShippedItem { version: string; date: string; summary: string }
export interface PR { number: number; title: string; author: string; ageDays: number }
export interface RubricCheck { label: string; pass: boolean }
export interface Member { handle: string; name: string }

export interface Momentum {
  commits: number; commitsDelta: number
  prs: number; prsDelta: number
  issues: number; issuesDelta: number
  spark: number[]
}

export interface Project {
  id: string
  name: string
  blurb: string
  status: Status
  health: Health
  version: string
  updatedDays: number
  next: string
  nextSuggested?: string
  momentum: Momentum
  rubric: RubricCheck[]
  shipped: ShippedItem[]
  inFlight: PR[]
  owners: Member[]
  tags: string[]
  links: { label: string; url: string }[]
  internal?: boolean
}

export interface Blocker { project: string; text: string; issue?: number }

export interface BoardData {
  org: string
  mission: string
  generatedAt: string
  refreshedAgoHours: number
  blockers: Blocker[]
  projects: Project[]
}
