// Memorable word lists for generating readable random room slugs
const ADJECTIVES = [
  'swift', 'bright', 'silent', 'cosmic', 'rapid', 'stellar', 'clever', 'hyper',
  'lunar', 'solar', 'quantum', 'neon', 'crisp', 'prime', 'brave', 'sharp',
  'amber', 'azure', 'silver', 'golden', 'velvet', 'agile', 'vivid', 'turbo',
  'frosty', 'spark', 'polar', 'zenith', 'nexus', 'emerald', 'sonic', 'blaze'
];

const NOUNS = [
  'falcon', 'orbit', 'comet', 'badger', 'haven', 'beacon', 'atlas', 'phoenix',
  'voyage', 'matrix', 'stream', 'pulse', 'spark', 'vertex', 'delta', 'harbor',
  'summit', 'quasar', 'shadow', 'canyon', 'glider', 'signal', 'cipher', 'echo',
  'aurora', 'prism', 'vortex', 'spire', 'canvas', 'horizon', 'drift', 'nebula'
];

/**
 * Generate a friendly random slug like "swift-falcon-42"
 */
export function generateRandomRoomSlug() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90 + 10); // 10-99
  return `${adj}-${noun}-${num}`;
}
