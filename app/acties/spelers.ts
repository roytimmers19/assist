'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { vereisLeider } from '@/lib/auth/sessie'
import { keurGoed, maakUitnodiging } from '@/lib/auth/uitnodiging'
import { db } from '@/lib/db/client'
import { zetAutomatischToelaten } from '@/lib/db/instellingen'
import { maakSpeler, wijzigSpeler, zetActief, zoekSpelerOpRugnummer } from '@/lib/db/spelers'
import { APPNAAM } from '@/lib/weergave/namen'
import { sluitmomentVanaf } from '@/lib/domein/toelating'
import { alsTekst, alsTekstOfNiets, alsVinkje } from '@/lib/weergave/formulier'
import { alsPositie } from '@/lib/weergave/posities'
import { verstuurMail } from '@/lib/mail/verstuur'

async function stuurUitnodiging(spelerId: string, email: string, naam: string) {
  const token = await maakUitnodiging(db(), spelerId)
  const link = `${process.env.BETTER_AUTH_URL}/uitnodiging/${token}`

  await verstuurMail({
    aan: email,
    onderwerp: `Je bent uitgenodigd voor ${APPNAAM}`,
    tekst: [
      `Hoi ${naam},`,
      '',
      `Je bent toegevoegd aan ${APPNAAM}, waar we de aanwezigheid van SV Voorbeeld 2 bijhouden.`,
      'Klik op onderstaande link om binnen te komen. De link is een week geldig.',
      '',
      link,
    ].join('\n'),
  })
}

export async function voegSpelerToe(formulier: FormData) {
  await vereisLeider()
  const naam = alsTekst(formulier, 'naam').trim()
  const email = alsTekst(formulier, 'email')
    .trim()
    .toLowerCase()
  const rugnummerRuw = alsTekst(formulier, 'rugnummer').trim()

  const speler = await maakSpeler(db(), {
    naam,
    email,
    rugnummer: rugnummerRuw ? Number(rugnummerRuw) : null,
  })
  await stuurUitnodiging(speler.id, email, naam)
  revalidatePath('/leider/spelers')
}

export async function stuurUitnodigingOpnieuw(formulier: FormData) {
  await vereisLeider()
  const spelerId = alsTekst(formulier, 'spelerId')
  const email = alsTekst(formulier, 'email')
  const naam = alsTekst(formulier, 'naam')

  await stuurUitnodiging(spelerId, email, naam)
  revalidatePath('/leider/spelers')
}

export async function keurAanmeldingGoed(formulier: FormData) {
  await vereisLeider()
  await keurGoed(db(), alsTekst(formulier, 'spelerId'))
  revalidatePath('/leider/spelers')
}

export async function wisselActief(formulier: FormData) {
  await vereisLeider()
  await zetActief(db(), alsTekst(formulier, 'spelerId'), formulier.get('actief') === 'ja')
  revalidatePath('/leider/spelers')
}

export async function bewerkSpeler(formulier: FormData) {
  const leider = await vereisLeider()
  const spelerId = alsTekst(formulier, 'spelerId')
  const weergavenaam = alsTekstOfNiets(formulier, 'weergavenaam')
  const rugnummerRuw = alsTekst(formulier, 'rugnummer').trim()
  const rugnummer = rugnummerRuw ? Number(rugnummerRuw) : null
  const wordtLeider = formulier.get('rol') === 'leider'

  if (rugnummer !== null) {
    if (!Number.isInteger(rugnummer) || rugnummer < 1 || rugnummer > 99) {
      redirect('/leider/spelers?fout=nummer')
    }
    // Twee keer de 7 op één opstellingsbriefje helpt niemand.
    const bezetter = await zoekSpelerOpRugnummer(db(), rugnummer)
    if (bezetter && bezetter.id !== spelerId) {
      redirect(`/leider/spelers?fout=bezet&nr=${rugnummer}`)
    }
  }

  // Jezelf degraderen sluit je buiten het leidersscherm, en dan kan niemand het
  // meer terugdraaien behalve via de database.
  if (!wordtLeider && spelerId === leider.id) redirect('/leider/spelers?fout=jezelf')

  await wijzigSpeler(db(), spelerId, {
    weergavenaam,
    rugnummer,
    positie: alsPositie(formulier.get('positie')),
    rol: wordtLeider ? 'leider' : 'speler',
    doetTrainingen: alsVinkje(formulier, 'doetTrainingen'),
    doetWedstrijden: alsVinkje(formulier, 'doetWedstrijden'),
  })

  revalidatePath('/leider/spelers')
  revalidatePath('/leider')
}

/** De deur 24 uur openzetten, zodat je niet dertien keer op goedkeuren hoeft te tikken. */
export async function zetDeurOpen() {
  await vereisLeider()
  await zetAutomatischToelaten(db(), sluitmomentVanaf(new Date()))
  revalidatePath('/leider/spelers')
}

export async function sluitDeur() {
  await vereisLeider()
  await zetAutomatischToelaten(db(), null)
  revalidatePath('/leider/spelers')
}
