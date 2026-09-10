import { config } from 'dotenv'

/**
 * Laadt .env.local met .env als terugval, net zoals Next.js dat doet.
 * Nodig voor alles wat buiten Next.js draait: tests, migraties en scripts.
 */
export function laadOmgeving() {
  config({ path: ['.env.local', '.env'], quiet: true })
}
