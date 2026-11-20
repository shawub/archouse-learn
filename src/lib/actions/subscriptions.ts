'use server'

import { auth } from '@/auth'
import { subscriptionStore } from '@/lib/subscription-store'
import {
  subscribeToTeacher as subscribeToTeacherCore,
  unsubscribeFromTeacher as unsubscribeFromTeacherCore,
  type SubscriptionDeps,
} from '@/lib/subscriptions'

const deps: SubscriptionDeps = {
  getSession: async () => {
    const session = await auth()
    return session?.user?.id ? { userId: session.user.id } : null
  },
  store: subscriptionStore,
}

// The subscriber is always the session user; the teacher id is the only input.
export async function subscribeToTeacher(teacherId: string) {
  return subscribeToTeacherCore(teacherId, deps)
}

export async function unsubscribeFromTeacher(teacherId: string) {
  return unsubscribeFromTeacherCore(teacherId, deps)
}
