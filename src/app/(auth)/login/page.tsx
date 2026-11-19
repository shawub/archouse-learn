import { LoginForm } from '@/components/forms/login-form'
import { getOAuthAvailability } from '@/lib/auth-providers'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; reset?: string }>
}) {
  const { email, error, reset } = await searchParams
  const { showGoogle, showMicrosoft } = getOAuthAvailability()
  const notice = reset === 'success' ? 'Your password has been reset. Sign in with your new password.' : undefined
  return (
    <LoginForm
      defaultEmail={email}
      error={error}
      notice={notice}
      showGoogle={showGoogle}
      showMicrosoft={showMicrosoft}
    />
  )
}
