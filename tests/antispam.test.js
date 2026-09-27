const assert = require('node:assert/strict');
const { protect, resetForTests } = require('../api/_antispam');

function response() {
  return {
    headers: {},
    statusCode: null,
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

function request(headers = {}) {
  return {
    headers: {
      origin: 'https://piotrmatejuk.com',
      referer: 'https://piotrmatejuk.com/',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0',
      'accept-language': 'pl-PL',
      'x-forwarded-for': '203.0.113.10',
      ...headers,
    },
  };
}

function check(req, body, options = {}) {
  const res = response();
  const handled = protect(req, res, body, { form: 'test', textFields: ['message'], ...options });
  return { handled, res };
}

resetForTests();
let result = check(request(), { email: 'jan@example.com', message: 'Chcę porozmawiać o szkoleniu.' });
assert.equal(result.handled, false);
assert.equal(result.res.headers['Cache-Control'], 'no-store');

resetForTests();
result = check(request(), { firma: 'Spam Ltd', email: 'bot@example.com', message: 'Oferta' });
assert.equal(result.handled, true);
assert.equal(result.res.statusCode, 200);

resetForTests();
result = check(request({ origin: 'https://evil.example', referer: 'https://evil.example/' }), { email: 'x@example.com', message: 'Hej' });
assert.equal(result.handled, true);
assert.equal(result.res.statusCode, 403);

resetForTests();
result = check(request({ origin: '', referer: '' }), { email: 'x@example.com', message: 'Hej' });
assert.equal(result.handled, true);
assert.equal(result.res.statusCode, 403);

resetForTests();
result = check(request(), { email: 'bot@example.com', message: 'SEO services, backlinks and guest posts: https://a.com https://b.com https://c.com' });
assert.equal(result.handled, true);
assert.equal(result.res.statusCode, 200);

resetForTests();
result = check(request(), { email: 'nwiqigdnl486@hotmail.com', wiadomosc: 'Proszę o więcej informacji i kontakt e-mailowy — piotr matejuk.' }, { form: 'contact', textFields: ['imie', 'temat', 'wiadomosc'] });
assert.equal(result.handled, true);
assert.equal(result.res.statusCode, 200);

resetForTests();
result = check(request(), { email: 'jan@example.com', message: 'Normalna wiadomość', form_started_at: Date.now() - 500 });
assert.equal(result.handled, true);
assert.equal(result.res.statusCode, 200);

resetForTests();
for (let i = 0; i < 2; i += 1) {
  assert.equal(check(request(), { email: `jan${i}@example.com`, message: `Wiadomość ${i}` }, { limit: 2 }).handled, false);
}
result = check(request(), { email: 'jan3@example.com', message: 'Wiadomość 3' }, { limit: 2 });
assert.equal(result.handled, true);
assert.equal(result.res.statusCode, 429);
assert.equal(result.res.headers['Retry-After'], '600');

console.log('antispam: PASS');
