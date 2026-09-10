import { type Db, db } from '../lib/db/client'
import { laadOmgeving } from '../lib/omgeving'

/**
 * De opstart die elk script deelt. Binnen Next.js is de omgeving al geladen en
 * volstaat db(); daarbuiten moet dat eerst zelf gebeuren, en die vier regels
 * stonden in elk script apart overgeschreven.
 *
 * Bewust hier en niet in lib/db/client.ts: dan zou de app dotenv meeslepen
 * voor iets dat alleen scripts nodig hebben.
 */
export function scriptDb(): Db {
  laadOmgeving()
  return db()
}
