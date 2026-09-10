import { Merkteken } from './Merkteken'

/**
 * De schermen vóór het inloggen: uitnodiging, inloggen, aanmelden, wachten.
 * Eén vorm voor alle vier, zodat binnenkomen als één weg aanvoelt en niet als
 * vier losse pagina's.
 */
export function Poort({
  titel,
  inleiding,
  children,
  voet,
}: {
  titel: string
  inleiding?: React.ReactNode
  children?: React.ReactNode
  voet?: React.ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-7 px-5 py-12">
      <Merkteken />

      <div className="opkomen">
        <h1 className="uithangbord text-[2rem]">{titel}</h1>
        {inleiding && <p className="mt-3 text-sm text-zacht">{inleiding}</p>}
      </div>

      {children}

      {voet && <div className="text-center text-sm text-zacht">{voet}</div>}
    </main>
  )
}
