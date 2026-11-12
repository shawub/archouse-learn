import { LoginForm } from '@/components/forms/login-form'
import { getOAuthAvailability } from '@/lib/auth-providers'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>
}) {
  const { email, error } = await searchParams
  const { showGoogle, showMicrosoft } = getOAuthAvailability()
  return <LoginForm defaultEmail={email} error={error} showGoogle={showGoogle} showMicrosoft={showMicrosoft} />
}
