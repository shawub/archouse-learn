'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { mailer } from '@/lib/mailer'
import { checkRateLimit } from '@/lib/rate-limit'
import { passwordResetStore } from '@/lib/password-reset-store'
import {
  requestPasswordReset,
  resetPassword,
  type RequestResetResult,
  type ResetPasswordResult,
} from '@/lib/password-reset'

async function clientIp() {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown'
}

export async function requestPasswordResetAction(
  _: RequestResetResult | null,
  formData: FormData,
): Promise<RequestResetResult> {
  return requestPasswordReset(
    { email: formData.get('email'), ip: await clientIp() },
    {
      store: passwordResetStore,
      mailer,
      checkRateLimit,
      // Links are built from config, never from the Host header (prevents reset-link poisoning).
      appUrl: process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000',
    },
  )
}

export async function resetPasswordAction(
  _: ResetPasswordResult | null,
  formData: FormData,
): Promise<ResetPasswordResult> {
  const result = await resetPassword(
    { token: formData.get('token'), password: formData.get('password') },
    { store: passwordResetStore, hashPassword: password => bcrypt.hash(password, 12) },
  )
  if (result.ok) redirect('/login?reset=success')
  return result
}
