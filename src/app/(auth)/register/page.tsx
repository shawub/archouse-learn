import { RegisterForm } from '@/components/forms/register-form'
import { getOAuthAvailability } from '@/lib/auth-providers'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; name?: string; email?: string; oauth?: string }>
}) {
  const { role, name, email, oauth } = await searchParams
  const { showGoogle, showMicrosoft } = getOAuthAvailability()
  return (
    <RegisterForm
      defaultRole={role}
      defaultName={name}
      defaultEmail={email}
      fromOAuth={oauth === '1'}
      showGoogle={showGoogle}
      showMicrosoft={showMicrosoft}
    />
  )
}
