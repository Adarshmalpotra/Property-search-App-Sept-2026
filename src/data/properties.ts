import type { City, Status } from '../lib/finance';

export type PropertyType = 'Apartment' | 'Villa' | 'Row house' | 'Studio';

export interface Property {
  id: string;
  title: string;
  city: City;
  locality: string;
  district: string;
  zone: string;
  type: PropertyType;
  bhk: number;
  carpetSqft: number;
  price: number;
  pricePerSqft: number;
  status: Status;
  possession: string;
  developer: string;
  floor: string;
  facing: string;
  amenities: string[];
  highlights: string[];
  reraId: string;
  hue: number;
}

interface Locality {
  city: City;
  name: string;
  /** Revenue district, matching MortgageDash's Location column (e.g. MUMBAI SUBURBAN). */
  district: string;
  zone: string;
  /** Indicative carpet-area rate, ₹/sq ft */
  rate: number;
  highlights: string[];
}

// Indicative 2026 carpet-area rates; for demonstration only.
const LOCALITIES: Locality[] = [
  { city: 'Mumbai', name: 'Bandra West', district: 'Mumbai Suburban', zone: 'Western Suburbs', rate: 58_000, highlights: ['Sea-link access', 'Carter Road promenade'] },
  { city: 'Mumbai', name: 'Worli', district: 'Mumbai City', zone: 'South Central', rate: 62_000, highlights: ['Coastal Road', 'Sea views'] },
  { city: 'Mumbai', name: 'Andheri West', district: 'Mumbai Suburban', zone: 'Western Suburbs', rate: 31_000, highlights: ['Metro Line 1', 'Lokhandwala market'] },
  { city: 'Mumbai', name: 'Powai', district: 'Mumbai Suburban', zone: 'Central Suburbs', rate: 29_000, highlights: ['Hiranandani Gardens', 'Powai Lake'] },
  { city: 'Mumbai', name: 'Goregaon East', district: 'Mumbai Suburban', zone: 'Western Suburbs', rate: 23_000, highlights: ['NESCO & Oberoi Mall', 'WEH access'] },
  { city: 'Mumbai', name: 'Chembur', district: 'Mumbai Suburban', zone: 'Eastern Suburbs', rate: 26_000, highlights: ['Eastern Freeway', 'Monorail'] },
  { city: 'Mumbai', name: 'Malad West', district: 'Mumbai Suburban', zone: 'Western Suburbs', rate: 21_000, highlights: ['Mindspace IT park', 'Metro Line 2A'] },
  { city: 'Mumbai', name: 'Borivali West', district: 'Mumbai Suburban', zone: 'Western Suburbs', rate: 22_000, highlights: ['Sanjay Gandhi National Park', 'Metro Line 2A'] },
  { city: 'Mumbai', name: 'Mulund West', district: 'Mumbai Suburban', zone: 'Eastern Suburbs', rate: 19_500, highlights: ['LBS Marg retail', 'Central line'] },
  { city: 'Mumbai', name: 'Kandivali East', district: 'Mumbai Suburban', zone: 'Western Suburbs', rate: 18_500, highlights: ['Metro Line 7', 'Thakur Village schools'] },
  { city: 'Mumbai', name: 'Bhandup West', district: 'Mumbai Suburban', zone: 'Eastern Suburbs', rate: 17_500, highlights: ['LBS Marg', 'Central line'] },
  { city: 'Mumbai', name: 'Dahisar East', district: 'Mumbai Suburban', zone: 'Western Suburbs', rate: 16_000, highlights: ['Metro Line 2A & 7 interchange', 'Western Express Highway'] },
  { city: 'Mumbai', name: 'Thane West', district: 'Thane', zone: 'MMR – Thane', rate: 15_500, highlights: ['Ghodbunder Road', 'Upcoming Metro 4'] },
  { city: 'Mumbai', name: 'Mira Road', district: 'Thane', zone: 'MMR – North', rate: 13_000, highlights: ['Metro Line 9', 'Western Express Highway'] },
  { city: 'Mumbai', name: 'Kharghar', district: 'Raigad', zone: 'MMR – Navi Mumbai', rate: 11_500, highlights: ['Navi Mumbai Airport', 'Central Park'] },
  { city: 'Bengaluru', name: 'Indiranagar', district: 'Bengaluru Urban', zone: 'East', rate: 21_000, highlights: ['100 Ft Road', 'Purple line metro'] },
  { city: 'Bengaluru', name: 'Koramangala', district: 'Bengaluru Urban', zone: 'South East', rate: 19_000, highlights: ['Startup hub', 'Forum Mall'] },
  { city: 'Bengaluru', name: 'HSR Layout', district: 'Bengaluru Urban', zone: 'South East', rate: 15_000, highlights: ['Outer Ring Road', 'Agara Lake'] },
  { city: 'Bengaluru', name: 'Hebbal', district: 'Bengaluru Urban', zone: 'North', rate: 13_500, highlights: ['Airport corridor', 'Manyata Tech Park'] },
  { city: 'Bengaluru', name: 'JP Nagar', district: 'Bengaluru Urban', zone: 'South', rate: 12_000, highlights: ['Green line metro', 'Established schools'] },
  { city: 'Bengaluru', name: 'Whitefield', district: 'Bengaluru Urban', zone: 'East', rate: 10_500, highlights: ['ITPL', 'Purple line metro'] },
  { city: 'Bengaluru', name: 'Sarjapur Road', district: 'Bengaluru Urban', zone: 'South East', rate: 9_800, highlights: ['Wipro & RMZ Ecospace', 'International schools'] },
  { city: 'Bengaluru', name: 'Bannerghatta Road', district: 'Bengaluru Urban', zone: 'South', rate: 9_500, highlights: ['IIM Bangalore', 'Pink line metro'] },
  { city: 'Bengaluru', name: 'Yelahanka', district: 'Bengaluru Urban', zone: 'North', rate: 8_800, highlights: ['Airport 20 min', 'Air Force Station greens'] },
  { city: 'Bengaluru', name: 'Electronic City', district: 'Bengaluru Urban', zone: 'South', rate: 7_200, highlights: ['Infosys campus', 'Yellow line metro'] },
];

const DEVELOPERS: Record<City, string[]> = {
  Mumbai: ['Lodha', 'Godrej Properties', 'Oberoi Realty', 'Hiranandani', 'Kalpataru', 'Runwal', 'Rustomjee', 'Piramal Realty', 'L&T Realty', 'Shapoorji Pallonji'],
  Bengaluru: ['Prestige', 'Sobha', 'Brigade', 'Godrej Properties', 'Puravankara', 'Embassy', 'Mahindra Lifespaces', 'Salarpuria Sattva', 'Total Environment', 'Assetz'],
};

const PROJECT_WORDS = ['Grove', 'Heights', 'Residences', 'Park', 'Vista', 'Crest', 'Serene', 'Horizon', 'Meadows', 'Towers', 'Bay', 'Enclave'];
const AMENITIES = ['Swimming pool', 'Gym', 'Clubhouse', 'Kids play area', 'Covered parking', '24×7 security', 'Power backup', 'Jogging track', 'EV charging', 'Co-working lounge', 'Rainwater harvesting', 'Indoor games'];
const FACINGS = ['East', 'North', 'North-East', 'West', 'South-East'];

/** Deterministic PRNG so every visitor sees the same sample catalogue. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function sample<T>(rnd: () => number, arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
}

// Typical carpet areas by configuration differ between the two cities.
const SIZE: Record<City, Record<number, [number, number]>> = {
  Mumbai: { 0: [280, 380], 1: [380, 520], 2: [560, 800], 3: [850, 1250], 4: [1400, 2200] },
  Bengaluru: { 0: [380, 480], 1: [520, 700], 2: [850, 1150], 3: [1250, 1750], 4: [2000, 3200] },
};

function build(): Property[] {
  const rnd = mulberry32(20260926);
  const list: Property[] = [];
  let n = 0;
  for (const loc of LOCALITIES) {
    // Prime localities skew to 2–3 BHK; mid-priced ones include compact studios/1 BHKs; outer ones get more large homes & villas.
    const configs = loc.rate > 25_000 ? [1, 2, 2, 3, 4] : loc.rate > 14_000 ? [0, 1, 1, 2, 3, 4] : [0, 1, 2, 3, 3, 4];
    const count = 5 + Math.floor(rnd() * 3);
    for (let i = 0; i < count; i++) {
      n++;
      const bhk = pick(rnd, configs);
      const [lo, hi] = SIZE[loc.city][bhk];
      const carpetSqft = Math.round((lo + rnd() * (hi - lo)) / 5) * 5;
      const underConstruction = rnd() < 0.4;
      let type: PropertyType = bhk === 0 ? 'Studio' : 'Apartment';
      if (loc.city === 'Bengaluru' && bhk >= 3 && loc.rate < 12_000 && rnd() < 0.45) type = rnd() < 0.5 ? 'Villa' : 'Row house';
      if (loc.city === 'Mumbai' && bhk >= 3 && loc.rate < 14_000 && rnd() < 0.25) type = 'Row house';
      const variance = 0.88 + rnd() * 0.26 - (underConstruction ? 0.05 : 0) + (type === 'Villa' ? 0.12 : 0);
      const pricePerSqft = Math.round((loc.rate * variance) / 50) * 50;
      const price = Math.round((pricePerSqft * carpetSqft) / 50_000) * 50_000;
      const developer = pick(rnd, DEVELOPERS[loc.city]);
      const project = `${developer.split(' ')[0]} ${pick(rnd, PROJECT_WORDS)}`;
      const year = 2026 + 1 + Math.floor(rnd() * 3);
      const totalFloors = type === 'Apartment' || type === 'Studio' ? 12 + Math.floor(rnd() * 40) : 3;
      list.push({
        id: `${loc.city === 'Mumbai' ? 'MUM' : 'BLR'}-${String(n).padStart(3, '0')}`,
        title: `${bhk === 0 ? 'Studio' : `${bhk} BHK ${type === 'Apartment' ? 'Apartment' : type}`} in ${project}`,
        city: loc.city,
        locality: loc.name,
        district: loc.district,
        zone: loc.zone,
        type,
        bhk,
        carpetSqft,
        price,
        pricePerSqft: Math.round(price / carpetSqft),
        status: underConstruction ? 'Under construction' : 'Ready to move',
        possession: underConstruction ? `${pick(rnd, ['Mar', 'Jun', 'Sep', 'Dec'])} ${year}` : 'Immediate',
        developer,
        floor: type === 'Apartment' || type === 'Studio' ? `${1 + Math.floor(rnd() * totalFloors)} of ${totalFloors}` : 'G+2',
        facing: pick(rnd, FACINGS),
        amenities: sample(rnd, AMENITIES, 4 + Math.floor(rnd() * 5)),
        highlights: loc.highlights,
        reraId: loc.city === 'Mumbai' ? `P5180${String(10000 + Math.floor(rnd() * 89999))}` : `PRM/KA/RERA/1251/${300 + Math.floor(rnd() * 200)}/PR/${String(1000 + Math.floor(rnd() * 8999))}`,
        hue: Math.floor(rnd() * 360),
      });
    }
  }
  return list;
}

export const PROPERTIES: Property[] = build();

export const LOCALITIES_BY_CITY: Record<City, string[]> = {
  Mumbai: LOCALITIES.filter((l) => l.city === 'Mumbai').map((l) => l.name),
  Bengaluru: LOCALITIES.filter((l) => l.city === 'Bengaluru').map((l) => l.name),
};

export const DISTRICTS_BY_CITY: Record<City, string[]> = {
  Mumbai: [...new Set(LOCALITIES.filter((l) => l.city === 'Mumbai').map((l) => l.district))],
  Bengaluru: [...new Set(LOCALITIES.filter((l) => l.city === 'Bengaluru').map((l) => l.district))],
};
