import { and, eq, isNotNull } from 'drizzle-orm'
import { account } from './auth-schema'
import type { Db } from './client'

/**
 * De gebruikers die hier een wachtwoord hebben. Bij een Google-account is er
 * geen wachtwoord om te herstellen, dus daar heeft een herstellink geen
 * betekenis.
 */
export async function leesWachtwoordGebruikers(db: Db): Promise<Set<string>> {
  const rijen = await db
    .select({ gebruikerId: account.userId })
    .from(account)
    .where(and(eq(account.providerId, 'credential'), isNotNull(account.password)))

  return new Set(rijen.map((rij) => rij.gebruikerId))
}
