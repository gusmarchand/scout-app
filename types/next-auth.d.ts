import type { Role, Unit } from '@/types'
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    id: string
    role: Role
    unit: Unit | null
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: Role
      unit: Unit | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    unit: Unit | null
  }
}
