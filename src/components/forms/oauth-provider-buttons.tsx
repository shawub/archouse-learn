import type { CSSProperties } from 'react'

type FormAction = (formData: FormData) => void | Promise<void>

export type OAuthProviderButtonsProps = {
  showGoogle: boolean
  showMicrosoft: boolean
  source: 'login' | 'register'
  role?: 'TEACHER' | 'STUDENT'
  googleAction: FormAction
  microsoftAction: FormAction
}

// Shared button shape; provider-specific colours/fonts come from each brand's guidelines.
const buttonClass =
  'w-full flex items-center justify-center gap-3 px-3 h-10 rounded-lg border transition-colors ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 ' +
  'disabled:opacity-60'

// Google: white background, #747775 border, #1F1F1F Roboto Medium text, full-colour "G".
const googleStyle: CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderColor: '#747775',
  color: '#1F1F1F',
  fontFamily: 'Roboto, Arial, sans-serif',
  fontWeight: 500,
  fontSize: 14,
}

// Microsoft: white background, #8C8C8C border, #5E5E5E Segoe UI Semibold text, four-square logo.
const microsoftStyle: CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderColor: '#8C8C8C',
  color: '#5E5E5E',
  fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
  fontWeight: 600,
  fontSize: 15,
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function MicrosoftLogo() {
  return (
    <svg aria-hidden="true" focusable="false" width="21" height="21" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

function IntentFields({ source, role }: { source: 'login' | 'register'; role?: string }) {
  return (
    <>
      <input type="hidden" name="source" value={source} />
      {source === 'register' && role && <input type="hidden" name="role" value={role} />}
    </>
  )
}

export function OAuthProviderButtons({
  showGoogle,
  showMicrosoft,
  source,
  role,
  googleAction,
  microsoftAction,
}: OAuthProviderButtonsProps) {
  if (!showGoogle && !showMicrosoft) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3" role="separator" aria-label="or continue with">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-500">or continue with</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      {showGoogle && (
        <form action={googleAction}>
          <IntentFields source={source} role={role} />
          <button type="submit" className={buttonClass} style={googleStyle} aria-label="Continue with Google">
            <GoogleLogo />
            <span>Continue with Google</span>
          </button>
        </form>
      )}

      {showMicrosoft && (
        <form action={microsoftAction}>
          <IntentFields source={source} role={role} />
          <button type="submit" className={buttonClass} style={microsoftStyle} aria-label="Continue with Microsoft">
            <MicrosoftLogo />
            <span>Continue with Microsoft</span>
          </button>
        </form>
      )}
    </div>
  )
}
