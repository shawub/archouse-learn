'use server'

import { auth } from '@/auth'
import { interestStore } from '@/lib/interest-store'
import {
  getMyInterests as getMyInterestsCore,
  updateInterests as updateInterestsCore,
  type InterestDeps,
} from '@/lib/interests'

const deps: InterestDeps = {
  getSession: async () => {
    const session = await auth()
    return session?.user?.id ? { userId: session.user.id } : null
  },
  store: interestStore,
}

// The user is always the session user; the interest list is the only input.
export async function updateInterests(interests: unknown) {
  return updateInterestsCore(interests, deps)
}

export async function getMyInterests() {
  return getMyInterestsCore(deps)
}
