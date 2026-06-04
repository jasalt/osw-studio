/**
 * Generates memorable 3-word slugs for deployment subdomains.
 * e.g., sunny-oak-river, bright-fox-hill, calm-pine-stone
 */

const ADJECTIVES = [
  'bold', 'bright', 'calm', 'cool', 'crisp', 'dark', 'deep', 'fair', 'fast',
  'fine', 'free', 'fresh', 'glad', 'gold', 'good', 'grand', 'green', 'keen',
  'kind', 'late', 'lean', 'light', 'live', 'long', 'loud', 'mild', 'neat',
  'new', 'nice', 'old', 'pale', 'pure', 'rare', 'red', 'rich', 'ripe',
  'safe', 'shy', 'slim', 'slow', 'soft', 'still', 'sunny', 'swift', 'tall',
  'thin', 'true', 'warm', 'west', 'wide', 'wild', 'wise', 'young',
];

const NOUNS_A = [
  'ash', 'bay', 'bee', 'bird', 'cave', 'clay', 'cove', 'dawn', 'deer',
  'dove', 'dune', 'elm', 'fern', 'fire', 'fish', 'fox', 'frost', 'gem',
  'glen', 'hawk', 'haze', 'hill', 'ivy', 'jade', 'lake', 'lark', 'leaf',
  'lily', 'lynx', 'mare', 'mint', 'moon', 'moss', 'oak', 'owl', 'palm',
  'peak', 'pine', 'plum', 'pond', 'rain', 'reef', 'ridge', 'robin', 'root',
  'rose', 'sand', 'seal', 'snow', 'star', 'stone', 'swan', 'thorn', 'tide',
  'vale', 'vine', 'wave', 'wren', 'wind', 'wolf',
];

const NOUNS_B = [
  'arch', 'bank', 'barn', 'bend', 'bluff', 'brook', 'cape', 'cliff',
  'cloud', 'coast', 'creek', 'crest', 'dale', 'dell', 'drift', 'falls',
  'field', 'flame', 'flat', 'ford', 'forge', 'gate', 'glade', 'grove',
  'haven', 'heart', 'hold', 'isle', 'keep', 'knoll', 'lane', 'ledge',
  'marsh', 'mead', 'mill', 'nest', 'notch', 'pass', 'patch', 'path',
  'pier', 'place', 'point', 'port', 'ranch', 'reach', 'rest', 'ridge',
  'rise', 'river', 'road', 'rock', 'run', 'shade', 'shore', 'slope',
  'spring', 'spur', 'trail', 'view', 'way', 'wood', 'yard',
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSlug(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS_A)}-${pick(NOUNS_B)}`;
}

export function generateUniqueSlug(exists: (slug: string) => boolean, maxAttempts = 20): string {
  for (let i = 0; i < maxAttempts; i++) {
    const slug = generateSlug();
    if (!exists(slug)) return slug;
  }
  // Fallback: append random suffix
  return `${generateSlug()}-${Math.random().toString(36).slice(2, 6)}`;
}
