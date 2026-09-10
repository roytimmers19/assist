import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db/client'
import { verstuurMail } from '@/lib/mail/verstuur'
import { biedHerstellinkAan } from './herstel'
import { APPNAAM } from '@/lib/weergave/namen'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db(), { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      // Vroeg de leider erom, dan gaat de link naar hem terug om door te
      // sturen. Vroeg de speler er zelf om, dan staat er niemand klaar en
      // gaat hij de deur uit.
      if (biedHerstellinkAan(url)) return

      await verstuurMail({
        aan: user.email,
        onderwerp: `Nieuw wachtwoord voor ${APPNAAM}`,
        tekst: `Klik op deze link om een nieuw wachtwoord te kiezen: ${url}`,
      })
    },
  },
  // Better Auth stuurt mislukte aanmeldingen anders naar zijn eigen Engelse
  // foutpagina, met een knop "Ask AI". Een speler hoort in het Nederlands te
  // lezen wat er aan de hand is.
  onAPIError: { errorURL: '/toegang-mislukt' },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
})
