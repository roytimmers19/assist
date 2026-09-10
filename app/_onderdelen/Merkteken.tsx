import { APPNAAM } from '@/lib/weergave/namen'
import { Merk } from './Schil'

/**
 * Het merk met de naam eronder, voor de schermen waar nog geen schil omheen
 * staat: inloggen, aanmelden, uitnodiging, wachten.
 */
export function Merkteken() {
  return (
    <div className="flex items-center gap-2.5">
      <Merk />
      <span className="bovenkop text-zacht">{APPNAAM}</span>
    </div>
  )
}
