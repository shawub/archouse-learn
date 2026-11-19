// Routes reachable without a session. Kept separate from middleware so it can be unit-tested.
export const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/ost']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname)
}
