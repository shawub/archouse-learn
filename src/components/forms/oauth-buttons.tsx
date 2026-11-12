'use client'

import { startGoogleSignIn, startMicrosoftSignIn } from '@/lib/actions/oauth'
import { OAuthProviderButtons, type OAuthProviderButtonsProps } from './oauth-provider-buttons'

export function OAuthButtons(props: Omit<OAuthProviderButtonsProps, 'googleAction' | 'microsoftAction'>) {
  return (
    <OAuthProviderButtons {...props} googleAction={startGoogleSignIn} microsoftAction={startMicrosoftSignIn} />
  )
}
