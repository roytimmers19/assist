const MILLISECONDEN_PER_UUR = 60 * 60 * 1000

/**
 * De afmelddeadline is een absolute duur voor aanvang, geen wandkloktijd.
 * Over een zomer-wintertijdovergang heen verschuift de getoonde tijd daardoor
 * een uur. Dat is bedoeld: 48 uur is 48 uur.
 */
export function berekenDeadline(startOp: Date, urenVooraf: number): Date {
  return new Date(startOp.getTime() - urenVooraf * MILLISECONDEN_PER_UUR)
}
