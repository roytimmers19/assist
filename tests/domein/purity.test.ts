import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const VERBODEN = ['lib/db', 'lib/auth', 'lib/mail', 'next', 'drizzle-orm', 'postgres', 'react', '@/lib/db']

describe('de pure laag blijft puur', () => {
  it('importeert niets uit de database-, auth- of framework-laag', () => {
    const map = join(process.cwd(), 'lib/domein')
    const overtredingen: string[] = []

    for (const bestand of readdirSync(map).filter((b) => b.endsWith('.ts'))) {
      const inhoud = readFileSync(join(map, bestand), 'utf8')
      for (const regel of inhoud.split('\n')) {
        const match = regel.match(/^\s*(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/)
        if (!match) continue
        const bron = match[1]
        if (bron.startsWith('.') || bron === 'luxon') continue
        if (VERBODEN.some((v) => bron === v || bron.startsWith(v + '/'))) {
          overtredingen.push(`${bestand}: ${bron}`)
        }
      }
    }

    expect(overtredingen).toEqual([])
  })
})
