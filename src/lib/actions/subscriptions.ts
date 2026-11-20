'use server'

import { auth } from '@/auth'
import { subscriptionStore } from '@/lib/subscriptions-store'
import {
  subscribe as subscribeCore,
  unsubscribe as unsubscribeCore,
  type SubscriptionDeps,
  type SubscriptionResult,
} from '@/lib/subscriptions'

const deps: SubscriptionDeps = {
  getSession: async () => {
    const session = await auth()
    return session?.user?.id ? { userId: session.user.id } : null
  },
  store: subscriptionStore,
}

export async function subscribeAction(teacherId: string): Promise<SubscriptionResult> {
  return subscribeCore({ teacherId }, deps)
}

export async function unsubscribeAction(teacherId: string): Promise<SubscriptionResult> {
  return unsubscribeCore({ teacherId }, deps)
}
