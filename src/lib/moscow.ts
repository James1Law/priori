export enum MoscowCategory {
  Must = 'must',
  Should = 'should',
  Could = 'could',
  Wont = 'wont',
}

export const MOSCOW_LABELS: Record<MoscowCategory, string> = {
  [MoscowCategory.Must]: 'Must Have',
  [MoscowCategory.Should]: 'Should Have',
  [MoscowCategory.Could]: 'Could Have',
  [MoscowCategory.Wont]: "Won't Have",
}

export const MOSCOW_COLOURS: Record<MoscowCategory, string> = {
  [MoscowCategory.Must]: 'bg-red-100 text-red-800 border-red-200',
  [MoscowCategory.Should]: 'bg-amber-100 text-amber-800 border-amber-200',
  [MoscowCategory.Could]: 'bg-blue-100 text-blue-800 border-blue-200',
  [MoscowCategory.Wont]: 'bg-gray-100 text-gray-800 border-gray-200',
}

export const MOSCOW_ORDER = [
  MoscowCategory.Must,
  MoscowCategory.Should,
  MoscowCategory.Could,
  MoscowCategory.Wont,
]
