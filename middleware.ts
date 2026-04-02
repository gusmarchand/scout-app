import { withAuth, type NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Protection de /admin/* : réservé aux admins uniquement
    if (pathname.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Autorise l'accès uniquement si un token JWT valide est présent
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    /*
     * Protège toutes les routes sauf :
     * - /login
     * - /_next/static (assets Next.js)
     * - /_next/image (optimisation d'images)
     * - /favicon.ico, /manifest.json, /icons/*, /images/* (assets statiques PWA)
     * - /api/auth/* (endpoints NextAuth)
     */
    '/((?!login|forgot-password|reset-password|_next/static|_next/image|favicon\\.ico|manifest\\.json|icons/|images/|api/auth/).*)',
  ],
}
