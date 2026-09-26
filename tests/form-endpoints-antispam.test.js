const assert = require('node:assert/strict');

const endpoints = [
  '../api/book-signup',
  '../api/contact',
  '../api/gfp-signup',
  '../api/rozmowa',
  '../api/shadow-work-signup',
  '../api/webinar-signup',
];

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

async function run() {
  for (const path of endpoints) {
    const handler = require(path);
    const res = response();
    await handler({
      method: 'POST',
      headers: {
        origin: 'https://piotrmatejuk.com',
        referer: 'https://piotrmatejuk.com/',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0',
        'accept-language': 'pl-PL',
        'x-forwarded-for': '203.0.113.20',
      },
      body: { firma: 'bot-filled-this-field' },
    }, res);

    assert.equal(res.statusCode, 200, `${path} should silently discard honeypot submissions`);
    assert.deepEqual(res.payload, { ok: true });
  }
  console.log('form endpoints antispam: PASS');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
