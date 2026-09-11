import { auth } from './auth'
import { vangHerstellink } from './herstel'

/**
 * Vraagt Better Auth om een herstellink en geeft hem terug in plaats van hem
 * te versturen. Bestaat het adres hier niet, dan komt er geen link. Naar
 * buiten toe antwoordt Better Auth in beide gevallen hetzelfde, zodat het
 * inlogscherm niet verraadt wie er in de ploeg zit.
 */
export async function vraagHerstellink(email: string): Promise<string | null> {
  return vangHerstellink(async () => {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: `${process.env.BETTER_AUTH_URL}/nieuw-wachtwoord` },
    })
  })
}
