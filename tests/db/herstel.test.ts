import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { maakSchoon, testDb } from './opzet'
import { auth } from '@/lib/auth/auth'
import { vraagHerstellink } from '@/lib/auth/wachtwoord'
import { leesWachtwoordGebruikers } from '@/lib/db/toegang'

async function maakWachtwoordAccount(email: string, wachtwoord: string) {
  await auth.api.signUpEmail({ body: { name: email, email, password: wachtwoord } })
}

async function maakGoogleAccount(gebruikerId: string, email: string) {
  await testDb.execute(
    sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values (${gebruikerId}, ${email}, ${email}, true, now(), now())`,
  )
  await testDb.execute(
    sql`insert into account (id, issuer, account_id, provider_id, user_id, created_at, updated_at)
        values (${gebruikerId + '-a'}, 'https://accounts.google.com', ${gebruikerId},
                'google', ${gebruikerId}, now(), now())`,
  )
}

async function gebruikerIdVan(email: string): Promise<string> {
  const rijen = await testDb.execute(sql`select id from "user" where email = ${email}`)
  return (rijen as unknown as { id: string }[])[0].id
}

function tokenUit(link: string): string {
  return new URL(link).pathname.split('/').pop() as string
}

describe('een herstellink voor wie zijn wachtwoord kwijt is', () => {
  beforeEach(async () => {
    await maakSchoon()
    await testDb.execute(sql`truncate table "user" cascade`)
  })

  it('geeft een link terug voor een adres met een wachtwoord', async () => {
    await maakWachtwoordAccount('aap@voorbeeld.nl', 'eerste-wachtwoord')

    const link = await vraagHerstellink('aap@voorbeeld.nl')

    expect(link).toContain('/reset-password/')
  })

  it('geeft niets terug voor een adres dat hier niet bestaat', async () => {
    expect(await vraagHerstellink('mies@voorbeeld.nl')).toBeNull()
  })

  it('laat met die link een nieuw wachtwoord kiezen, waarna het oude niet meer werkt', async () => {
    await maakWachtwoordAccount('noot@voorbeeld.nl', 'eerste-wachtwoord')
    const link = await vraagHerstellink('noot@voorbeeld.nl')

    await auth.api.resetPassword({
      body: { newPassword: 'tweede-wachtwoord', token: tokenUit(link as string) },
    })

    await expect(
      auth.api.signInEmail({ body: { email: 'noot@voorbeeld.nl', password: 'tweede-wachtwoord' } }),
    ).resolves.toBeTruthy()
    await expect(
      auth.api.signInEmail({ body: { email: 'noot@voorbeeld.nl', password: 'eerste-wachtwoord' } }),
    ).rejects.toThrow()
  })
})

describe('een herstel sluit de oude sessies af', () => {
  beforeEach(async () => {
    await maakSchoon()
    await testDb.execute(sql`truncate table "user" cascade`)
  })

  it('gooit bestaande sessies eruit zodra het wachtwoord hersteld is', async () => {
    await maakWachtwoordAccount('wim@voorbeeld.nl', 'eerste-wachtwoord')
    await auth.api.signInEmail({
      body: { email: 'wim@voorbeeld.nl', password: 'eerste-wachtwoord' },
    })
    // Aanmelden logt zelf al in, dus hoeveel het er zijn doet er niet toe;
    // dat het er méér dan nul zijn is wat dit scenario nodig heeft.
    const [voor] = await testDb.execute(sql`select count(*)::int as aantal from session`)
    expect((voor as { aantal: number }).aantal).toBeGreaterThan(0)

    const link = await vraagHerstellink('wim@voorbeeld.nl')
    await auth.api.resetPassword({
      body: { newPassword: 'tweede-wachtwoord', token: tokenUit(link as string) },
    })

    const [na] = await testDb.execute(sql`select count(*)::int as aantal from session`)
    expect((na as { aantal: number }).aantal).toBe(0)
  })
})

describe('wie hier een wachtwoord heeft', () => {
  beforeEach(async () => {
    await maakSchoon()
    await testDb.execute(sql`truncate table "user" cascade`)
  })

  it('telt een wachtwoordaccount wel mee en een Google-account niet', async () => {
    await maakWachtwoordAccount('aap@voorbeeld.nl', 'eerste-wachtwoord')
    await maakGoogleAccount('g-wim', 'wim@voorbeeld.nl')

    const metWachtwoord = await leesWachtwoordGebruikers(testDb)

    expect(metWachtwoord.has(await gebruikerIdVan('aap@voorbeeld.nl'))).toBe(true)
    expect(metWachtwoord.has('g-wim')).toBe(false)
  })
})
