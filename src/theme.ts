export const colors = {
  ink: '#1B2E26',
  inkSoft: '#38564D',
  paper: '#F9F8F2',
  white: '#FFFFFF',
  line: '#D8DED3',
  leaf: '#C8D5C7',
  leafDeep: '#A8C8A4',
  coral: '#B35A44',
  coralPale: '#F7E2D9',
  yellow: '#E8C763',
  muted: '#79877E',
  danger: '#A33F30',
  softGrey: '#E2E4DE',
};

export const rarityColors = {
  common: '#477C55',
  uncommon: '#59799A',
  rare: '#AA633F',
  exotic: '#8A526A',
} as const;

export type Rarity = keyof typeof rarityColors;