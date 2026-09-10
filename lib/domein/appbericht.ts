function alsOpsomming(namen: string[]): string {
  if (namen.length === 1) return namen[0]
  return `${namen.slice(0, -1).join(', ')} en ${namen[namen.length - 1]}`
}

/** De tekst die de leider op zijn klembord krijgt om in de groepsapp te plakken. */
export function maakAppBericht(invoer: {
  titel: string
  wanneer: string
  deadline: string
  stilleNamen: string[]
}): string {
  if (invoer.stilleNamen.length === 0) return 'Iedereen heeft al gereageerd.'

  return [
    `${invoer.titel} — ${invoer.wanneer}.`,
    `${alsOpsomming(invoer.stilleNamen)}: kunnen jullie even in de app aangeven of je er bent?`,
    `Afmelden kan tot en met ${invoer.deadline}.`,
  ].join('\n')
}
