export const philippineRegions = [
  { code: 'NCR', name: 'National Capital Region', psgc: '130000000', ebirdSubregions: ['National Capital Region (Manila)'] },
  { code: 'CAR', name: 'Cordillera Administrative Region', psgc: '140000000', ebirdSubregions: ['Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province'] },
  { code: 'REGION_I', name: 'Ilocos Region', psgc: '010000000', ebirdSubregions: ['Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan'] },
  { code: 'REGION_II', name: 'Cagayan Valley', psgc: '020000000', ebirdSubregions: ['Batanes', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino'] },
  { code: 'REGION_III', name: 'Central Luzon', psgc: '030000000', ebirdSubregions: ['Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga', 'Tarlac', 'Zambales'] },
  { code: 'REGION_IV_A', name: 'CALABARZON', psgc: '040000000', ebirdSubregions: ['Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal'] },
  { code: 'REGION_IV_B', name: 'MIMAROPA', psgc: '170000000', ebirdSubregions: ['Marinduque', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Romblon'] },
  { code: 'REGION_V', name: 'Bicol Region', psgc: '050000000', ebirdSubregions: ['Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'] },
  { code: 'REGION_VI', name: 'Western Visayas', psgc: '060000000', ebirdSubregions: ['Aklan', 'Antique', 'Capiz', 'Guimaras', 'Iloilo'] },
  { code: 'REGION_VII', name: 'Central Visayas', psgc: '070000000', ebirdSubregions: ['Bohol', 'Cebu'] },
  { code: 'REGION_VIII', name: 'Eastern Visayas', psgc: '080000000', ebirdSubregions: ['Biliran', 'Eastern Samar', 'Leyte', 'Northern Samar', 'Samar', 'Southern Leyte'] },
  { code: 'REGION_IX', name: 'Zamboanga Peninsula', psgc: '090000000', ebirdSubregions: ['Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'], unmappedAdministrativeUnits: ['City of Isabela'] },
  { code: 'REGION_X', name: 'Northern Mindanao', psgc: '100000000', ebirdSubregions: ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental'] },
  { code: 'REGION_XI', name: 'Davao Region', psgc: '110000000', ebirdSubregions: ['Davao de Oro', 'Davao Occidental', 'Davao Oriental', 'Davao del Norte', 'Davao del Sur'] },
  { code: 'REGION_XII', name: 'SOCCSKSARGEN', psgc: '120000000', ebirdSubregions: ['Cotabato', 'Sarangani', 'South Cotabato', 'Sultan Kudarat'] },
  { code: 'REGION_XIII', name: 'Caraga', psgc: '160000000', ebirdSubregions: ['Agusan del Norte', 'Agusan del Sur', 'Dinagat Islands', 'Surigao del Norte', 'Surigao del Sur'] },
  { code: 'BARMM', name: 'Bangsamoro Autonomous Region in Muslim Mindanao', psgc: '150000000', ebirdSubregions: ['Basilan', 'Lanao del Sur', 'Maguindanao', 'Sulu', 'Tawi-Tawi'], unmappedAdministrativeUnits: ['Cotabato City'] },
  { code: 'NIR', name: 'Negros Island Region', psgc: '180000000', ebirdSubregions: ['Negros Occidental', 'Negros Oriental', 'Siquijor'] },
] as const;

export type PhilippineRegionCode = (typeof philippineRegions)[number]['code'];
export type PhilippineRegion = (typeof philippineRegions)[number];

export type RegionalBadgeMotif =
  | 'urban-wetlands'
  | 'mountain-pine'
  | 'sea-cliffs'
  | 'river-ridges'
  | 'rice-marsh'
  | 'volcanic-lake'
  | 'karst-mangrove'
  | 'rainforest-volcano'
  | 'forest-mangrove'
  | 'negros-highlands'
  | 'limestone-islands'
  | 'pacific-rainforest'
  | 'mangrove-shore'
  | 'mountain-lake'
  | 'cloud-forest'
  | 'lake-wetlands'
  | 'marsh-rainforest'
  | 'southern-archipelago';

export type RegionalBadgeIdentity = {
  title: string;
  habitat: string;
  motif: RegionalBadgeMotif;
  accent: string;
  landscape: string;
  water: string;
};

export const regionalBadgeIdentities = {
  NCR: { title: 'Urban Wings', habitat: 'city skyline and wetlands', motif: 'urban-wetlands', accent: '#B35A44', landscape: '#536B5C', water: '#779A91' },
  CAR: { title: 'Highland Sentinel', habitat: 'mountain peaks and pine forest', motif: 'mountain-pine', accent: '#477C55', landscape: '#536B5C', water: '#89A59A' },
  REGION_I: { title: 'Coastal Voyager', habitat: 'sea cliffs and coastal birds', motif: 'sea-cliffs', accent: '#3F7780', landscape: '#65796C', water: '#6E9BA2' },
  REGION_II: { title: 'Valley Sovereign', habitat: 'great river and Sierra Madre', motif: 'river-ridges', accent: '#94713C', landscape: '#66745D', water: '#719A9A' },
  REGION_III: { title: 'Marshland Guardian', habitat: 'rice fields and wetlands', motif: 'rice-marsh', accent: '#66864A', landscape: '#7F8F56', water: '#779C91' },
  REGION_IV_A: { title: 'Volcanic Wings', habitat: 'Taal Lake and volcanic ridges', motif: 'volcanic-lake', accent: '#9A5A43', landscape: '#6F6257', water: '#71979A' },
  REGION_IV_B: { title: 'Island Crown', habitat: 'Palawan karst and mangroves', motif: 'karst-mangrove', accent: '#557C68', landscape: '#587466', water: '#6E9A91' },
  REGION_V: { title: 'Firewing', habitat: 'Mayon Volcano and rainforest', motif: 'rainforest-volcano', accent: '#B35A44', landscape: '#55745B', water: '#7B9C8D' },
  REGION_VI: { title: 'Forest Emblem', habitat: 'Panay forest and mangroves', motif: 'forest-mangrove', accent: '#477C55', landscape: '#55745B', water: '#71988C' },
  REGION_VII: { title: 'Island Navigator', habitat: 'limestone islands and coastal waters', motif: 'limestone-islands', accent: '#A47743', landscape: '#738372', water: '#6D9BA0' },
  REGION_VIII: { title: 'Pacific Sentinel', habitat: 'Pacific coastline and rainforest', motif: 'pacific-rainforest', accent: '#3F7780', landscape: '#55745B', water: '#69959B' },
  REGION_IX: { title: 'Coastal Guardian', habitat: 'mangroves and seashores', motif: 'mangrove-shore', accent: '#64845A', landscape: '#597566', water: '#719AA0' },
  REGION_X: { title: 'Highland Wings', habitat: 'mountain lakes and forests', motif: 'mountain-lake', accent: '#527B67', landscape: '#587362', water: '#71979A' },
  REGION_XI: { title: 'Mount Apo Crest', habitat: 'Mount Apo and cloud forest', motif: 'cloud-forest', accent: '#607A62', landscape: '#526B5A', water: '#91A8A0' },
  REGION_XII: { title: 'Lakekeeper', habitat: 'Lake Sebu and wetlands', motif: 'lake-wetlands', accent: '#8C7344', landscape: '#6F8055', water: '#70989B' },
  REGION_XIII: { title: 'Rainforest Emblem', habitat: 'Agusan Marsh and forest', motif: 'marsh-rainforest', accent: '#47745A', landscape: '#536D59', water: '#72998F' },
  BARMM: { title: 'Southern Archipelago', habitat: 'Sulu islands and coastal ecosystems', motif: 'southern-archipelago', accent: '#A06B43', landscape: '#6E7D68', water: '#6F9BA0' },
  NIR: { title: 'Negros Crest', habitat: 'Negros highlands and forest', motif: 'negros-highlands', accent: '#6A7950', landscape: '#596D58', water: '#87A095' },
} as const satisfies Record<PhilippineRegionCode, RegionalBadgeIdentity>;

export function composeRegionalBadgeAccessibilityLabel(
  regionCode: PhilippineRegionCode | null,
  regionName: string,
  rankTitle: string,
) {
  if (!regionCode) {
    return `${rankTitle} badge. Choose a home region to reveal its unique habitat.`;
  }
  const identity = regionalBadgeIdentities[regionCode];
  return `${rankTitle} badge for ${regionName}: ${identity.title}, featuring ${identity.habitat}.`;
}

export const philippineRegionCount = philippineRegions.length;

export function findPhilippineRegion(code: string | null | undefined): PhilippineRegion | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase().replace(/^PH[-_]/, '');
  return philippineRegions.find((region) => region.code === normalized || region.name.toUpperCase() === normalized) ?? undefined;
}
