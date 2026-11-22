'use server'

import { auth } from '@/auth'
import { deletionRequestStore } from '@/lib/deletion-request-store'
import { requestAccountDeletion, type RequestDeletionResult } from '@/lib/account-deletion'

/** Takes no account identifier: the caller is always resolved from the server session. */
export async function requestAccountDeletionAction(): Promise<RequestDeletionResult> {
  const session = await auth()
  return requestAccountDeletion({
    store: deletionRequestStore,
    session: { userId: session?.user?.id ?? null },
  })
}
