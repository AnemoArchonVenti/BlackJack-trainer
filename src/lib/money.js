// How the app prints money. One place, because the editorial skin sets these figures large in
// the serif (DESIGN-SPEC §2) and a raw `$7.5` or `$1007.5` reads as a bug at that size.
// Blackjack pays 3:2, so halves are real: show cents when there are any, and never otherwise.

/** money(7.5) -> "$7.50"; money(1000) -> "$1,000"; money(-5) -> "$5" (sign is the caller's job). */
export function money(n) {
  const abs = Math.abs(n);
  return `$${abs.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
