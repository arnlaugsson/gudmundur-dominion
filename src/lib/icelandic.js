// Icelandic number agreement: singular after numbers ending in 1, except 11
// (1 leikur, 21 leikur, 11 leikir, 5 leikir).
export function plural(n, one, many) {
  const isSingular = Number.isInteger(n) && n % 10 === 1 && n % 100 !== 11
  return `${n} ${isSingular ? one : many}`
}

export const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des']
export const MONTHS_LONG = [
  'janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní',
  'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember',
]

export function joinNames(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`
}
