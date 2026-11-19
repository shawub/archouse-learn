// Minimal mailer abstraction. The app has no email provider yet, so the
// default mailer logs messages server-side. Swap `mailer` for a real
// implementation (same interface) when a provider is added.

export interface Mailer {
  sendPasswordResetEmail(args: { to: string; resetUrl: string }): Promise<void>
}

export const logMailer: Mailer = {
  async sendPasswordResetEmail({ to, resetUrl }) {
    try {
      console.log(`[mailer] Password reset link for ${to}: ${resetUrl}`)
    } catch {
      // Logging must never break the request.
    }
  },
}

export const mailer: Mailer = logMailer
