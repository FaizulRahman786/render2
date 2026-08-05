const path = require('path');
const dotenv = require('dotenv');
const p = 'D:/c/coaching/second/.env';
const parsed = dotenv.parse(require('fs').readFileSync(p, 'utf8'));
console.log('parsed keys:', Object.keys(parsed).join(', '));
console.log('has DATABASE_URL:', !!parsed.DATABASE_URL);
const r = dotenv.config({ path: p });
console.log('config error:', r.error ? r.error.message : 'none');
console.log('env DATABASE_URL set:', !!process.env.DATABASE_URL);
