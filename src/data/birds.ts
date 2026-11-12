import type { Rarity } from '../theme';
import type { BirdRegion } from './regions';

export type Bird = {
  id: string;
  name: string;
  scientificName: string;
  rarity: Rarity;
  regions: BirdRegion[];
  description: string;
  habitat: string;
  family: string;
  size: 'Small' | 'Medium' | 'Large';
  imageUrl: string;
  imageCredit: string;
  imageLicense: string;
  imageSourceUrl: string;
  sourceUrl: string;
};

export const birds: Bird[] = [
  {
    id: 'palawan-peacock-pheasant',
    name: 'Palawan Peacock-Pheasant',
    scientificName: 'Polyplectron napoleonis',
    rarity: 'rare',
    regions: ['Asia'],
    description:
      'A striking forest pheasant endemic to Palawan. Males show blue-green eye-spots across the tail; the species is locally known as tandikan.',
    habitat: 'Woodland',
    family: 'Phasianidae',
    size: 'Medium',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Palawan_Peacock_Pheasant_-_male.jpg/960px-Palawan_Peacock_Pheasant_-_male.jpg',
    imageCredit: 'Dante Alighieri',
    imageLicense: 'CC BY-SA 3.0; photographed at the Bronx Zoo',
    imageSourceUrl:
      'https://commons.wikimedia.org/wiki/File:Palawan_Peacock_Pheasant_-_male.jpg',
    sourceUrl: 'https://en.wikipedia.org/wiki/Palawan_peacock-pheasant',
  },
  {
    id: 'palawan-hornbill',
    name: 'Palawan Hornbill',
    scientificName: 'Anthracoceros marchei',
    rarity: 'rare',
    regions: ['Asia'],
    description:
      'A large forest hornbill found on Palawan and nearby islands. Its loud calls can carry through the forest canopy.',
    habitat: 'Woodland',
    family: 'Bucerotidae',
    size: 'Large',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Anthracoceros_marchei_-Palawan-8.jpg/500px-Anthracoceros_marchei_-Palawan-8.jpg',
    imageCredit: 'Llimchiu',
    imageLicense: 'CC BY-SA 3.0',
    imageSourceUrl:
      'https://commons.wikimedia.org/wiki/File:Anthracoceros_marchei_-Palawan-8.jpg',
    sourceUrl: 'https://en.wikipedia.org/wiki/Palawan_hornbill',
  },
  {
    id: 'palawan-scops-owl',
    name: 'Palawan Scops-Owl',
    scientificName: 'Otus fuliginosus',
    rarity: 'uncommon',
    regions: ['Asia'],
    description:
      'A small owl found only on Palawan. It inhabits tropical lowland forest and is most often heard after dark.',
    habitat: 'Woodland',
    family: 'Strigidae',
    size: 'Small',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Palawan_Scops_Owl.jpg/960px-Palawan_Scops_Owl.jpg',
    imageCredit: 'Chetatata',
    imageLicense: 'CC BY-SA 4.0',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Palawan_Scops_Owl.jpg',
    sourceUrl: 'https://en.wikipedia.org/wiki/Palawan_scops_owl',
  },
];

export function getBird(id: string | undefined): Bird | undefined {
  return birds.find((bird) => bird.id === id);
}

export function getDailyFeaturedBird(date = new Date()): Bird {
  const localDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayNumber = Math.floor(localDay / 86_400_000);
  const index = ((dayNumber % birds.length) + birds.length) % birds.length;
  return birds[index];
}