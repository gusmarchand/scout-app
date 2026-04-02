import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import type { UserDocument } from '@/models/User'
import type { Role, Unit } from '@/types'
import type { FlattenMaps } from 'mongoose'

type LeanUser = FlattenMaps<UserDocument> & { _id: unknown }

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Identifiants invalides.')
        }

        await connectDB()

        const user = await User.findOne({ email: credentials.email.toLowerCase() }).lean() as LeanUser | null

        if (!user) {
          throw new Error('Identifiants invalides.')
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.passwordHash as string)

        if (!passwordMatch) {
          throw new Error('Identifiants invalides.')
        }

        return {
          id: (user._id as { toString(): string }).toString(),
          name: user.name as string,
          email: user.email as string,
          role: user.role as Role,
          unit: (user.unit as Unit | undefined) ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.unit = user.unit ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.unit = (token.unit as Unit) ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
