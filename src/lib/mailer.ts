export interface Mailer {
  sendPasswordResetEmail(opts: { to: string; resetUrl: string }): Promise<void>
}

// No email provider is configured yet. This default mailer logs the reset link
// server-side in development so the flow can be exercised locally. It never
// throws, and never logs the raw link outside development. Swap in a real
// provider here later behind the same interface.
export const consoleMailer: Mailer = {
  async sendPasswordResetEmail({ to, resetUrl }) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[mailer] Password reset link for ${to}: ${resetUrl}`)
    } else {
      console.warn('[mailer] No email provider configured; password reset email not sent')
    }
  },
}

export const mailer: Mailer = consoleMailer
