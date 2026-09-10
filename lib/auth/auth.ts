import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db/client'
import { verstuurMail } from '@/lib/mail/verstuur'
import { APPNAAM } from '@/lib/weergave/namen'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db(), { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await verstuurMail({
        aan: user.email,
        onderwerp: `Nieuw wachtwoord voor ${APPNAAM}`,
        tekst: `Klik op deze link om een nieuw wachtwoord te kiezen: ${url}`,
      })
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
})
