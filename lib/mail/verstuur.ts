import { Resend } from 'resend'

export type MailOpdracht = { aan: string; onderwerp: string; tekst: string }

/**
 * Of er überhaupt gemaild kan worden. De schermen verbergen daarmee wat zonder
 * mail toch niet werkt — een uitnodiging die nergens aankomt is erger dan geen
 * knop. Afgeleid en geen aparte schakelaar, zodat het vanzelf terugkomt zodra
 * de sleutel er staat.
 */
export function mailWerkt(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_AFZENDER)
}

/** De enige plek die Resend aanroept. */
export async function verstuurMail({ aan, onderwerp, tekst }: MailOpdracht): Promise<void> {
  const sleutel = process.env.RESEND_API_KEY
  const afzender = process.env.MAIL_AFZENDER

  if (!sleutel || !afzender) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY of MAIL_AFZENDER ontbreekt')
    }
    console.log(`[mail overgeslagen] aan ${aan}: ${onderwerp}\n${tekst}`)
    return
  }

  const resend = new Resend(sleutel)
  const { error } = await resend.emails.send({ from: afzender, to: aan, subject: onderwerp, text: tekst })
  if (error) throw new Error(`Mail niet verstuurd: ${error.message}`)
}
