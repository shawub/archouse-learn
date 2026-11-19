import { ResetPasswordForm } from '@/components/forms/reset-password-form'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token } = await searchParams
  return <ResetPasswordForm token={typeof token === 'string' ? token : ''} />
}
