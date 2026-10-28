import { RegisterForm } from '@/components/forms/register-form'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role } = await searchParams
  return <RegisterForm defaultRole={role} />
}
