const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { sessionRequest } = load('src/lib/auth/session-request.ts');
const { safePanelPath } = load('src/lib/auth/session-redirect.ts');
const { userMessage } = load('src/lib/user-message.ts');
const { publicQuoteRequestMessage } = load('src/lib/public-quote-requests.ts');
const { formatPrice, productPrice, hasAvailability } = load('src/lib/catalog.ts');
const { createRefreshCoordinator } = load('src/lib/auth/refresh-coordinator.ts');
const { clientFetch } = load('src/lib/client-fetch.ts');
const { formNumber, adminCatalogQuery } = load('src/lib/admin-catalog-utils.ts');

const renewed = { accessToken: 'new-access', refreshToken: 'new-refresh', user: { role: 'ADMIN' } };
const noRefresh = async () => {
  throw new Error('Unexpected refresh');
};

test('Catalog form treats whitespace as missing and keeps real zero values', () => {
  assert.equal(formNumber('   '), null);
  assert.equal(formNumber('0'), 0);
  assert.equal(formNumber('1250000.50'), 1250000.5);
});

test('Catalog pagination only forwards valid whole page numbers', () => {
  assert.equal(adminCatalogQuery({ page: '2.5' }), '');
  assert.equal(adminCatalogQuery({ page: 'Infinity' }), '');
  assert.equal(adminCatalogQuery({ page: '03' }), 'page=3');
});

test('A valid session reads data without rotating credentials', async () => {
  const result = await sessionRequest('access', 'refresh', {
    request: async (token) => {
      assert.equal(token, 'access');
      return Response.json({ data: [] });
    },
    refresh: noRefresh
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { data: [] });
});
test('Missing access cookie can be recovered with the refresh cookie', async () => {
  const result = await sessionRequest(undefined, 'refresh', {
    request: async (token) => {
      assert.equal(token, renewed.accessToken);
      return Response.json({ ok: true });
    },
    refresh: async () => ({ status: 200, data: renewed })
  });
  assert.equal(result.status, 200);
  assert.equal(result.refreshed, renewed);
});
test('Expired access retries once and keeps rotated cookies when the API goes offline', async () => {
  let calls = 0;
  const result = await sessionRequest('old', 'refresh', {
    request: async () => (++calls === 1 ? new Response(null, { status: 401 }) : null),
    refresh: async () => ({ status: 200, data: renewed })
  });
  assert.equal(calls, 2);
  assert.equal(result.status, 503);
  assert.equal(result.refreshed, renewed);
  assert.notEqual(result.expired, true);
});
test('Temporary refresh outage does not erase a valid refresh session', async () => {
  for (const status of [0, 429, 500, 503]) {
    const result = await sessionRequest(undefined, 'refresh', {
      request: async () => {
        throw new Error('Unexpected operation');
      },
      refresh: async () => ({ status, data: null })
    });
    assert.equal(result.status, 503);
    assert.equal(result.expired, false);
  }
});
test('Invalid refresh cookie requires a new login', async () => {
  const result = await sessionRequest(undefined, 'revoked', {
    request: async () => null,
    refresh: async () => ({ status: 401, data: null })
  });
  assert.equal(result.status, 401);
  assert.equal(result.expired, true);
});
test('A second unauthorized response ends the session without an infinite retry', async () => {
  let calls = 0;
  let refreshes = 0;
  const result = await sessionRequest('old', 'refresh', {
    request: async () => {
      calls++;
      return new Response(null, { status: 401 });
    },
    refresh: async () => {
      refreshes++;
      return { status: 200, data: renewed };
    }
  });
  assert.equal(calls, 2);
  assert.equal(refreshes, 1);
  assert.equal(result.expired, true);
});
test('An anonymous request never calls the protected API', async () => {
  const result = await sessionRequest(undefined, undefined, {
    request: noRefresh,
    refresh: noRefresh
  });
  assert.equal(result.status, 401);
});
test('Invalid successful JSON becomes a recoverable upstream error', async () => {
  const result = await sessionRequest('access', undefined, {
    request: async () => new Response('<html>Proxy error</html>'),
    refresh: noRefresh
  });
  assert.equal(result.status, 502);
  assert.equal(result.body, null);
});

for (const value of [
  '//external.example',
  '/\\external.example',
  'https://external.example/panel',
  '/panel/../../iniciar-sesion',
  '/api/session/refresh',
  '/panel\n/ventas',
  null
]) {
  test(`Session redirects reject unsafe/non-panel destination ${JSON.stringify(value)}`, () =>
    assert.equal(safePanelPath(value), '/panel'));
}
test('Session redirects preserve a valid panel destination and filters', () => {
  assert.equal(safePanelPath('/panel/ventas?q=cliente&page=2'), '/panel/ventas?q=cliente&page=2');
});
test('Network and rate-limit failures have actionable Spanish messages', () => {
  assert.match(userMessage(503), /vuelve a intentarlo/);
  assert.match(userMessage(429), /Espera/);
  assert.match(userMessage(401), /sesión/);
});
test('Public request errors never echo server exceptions', () => {
  for (const status of [400, 404, 409, 413, 429, 500, 503]) {
    const message = publicQuoteRequestMessage(status, {
      message: 'Sequelize Error: private database details'
    });
    assert.doesNotMatch(message, /Sequelize|private|database/);
    assert.ok(message.length > 20);
  }
});
test('Public prices retain centavos and do not turn missing prices into zero', () => {
  assert.match(formatPrice('1250000.50'), /50/);
  assert.equal(productPrice({ variants: [{ salePrice: null, status: 'ACTIVE' }] }), null);
  assert.equal(productPrice({ variants: [] }), null);
});
test('Inactive variants do not advertise inventory or lower prices', () => {
  const product = {
    variants: [
      { salePrice: '100', status: 'INACTIVE', availability: 8 },
      { salePrice: '500', status: 'ACTIVE', availability: 0 }
    ]
  };
  assert.equal(hasAvailability(product), false);
  assert.equal(productPrice(product), formatPrice('500'));
});
test('One known available variant is enough even when other availability is missing', () => {
  assert.equal(
    hasAvailability({ variants: [{ status: 'ACTIVE', availability: 1 }, { status: 'ACTIVE' }] }),
    true
  );
});

test('Concurrent and slightly delayed renewals share one token rotation', async () => {
  let calls = 0;
  const refresh = createRefreshCoordinator(
    async () => {
      calls++;
      return { data: renewed };
    },
    (result) => Boolean(result.data)
  );
  const results = await Promise.all([refresh('token', 'hash'), refresh('token', 'hash')]);
  await refresh('token', 'hash');
  assert.equal(calls, 1);
  assert.equal(results[0], results[1]);
});
test('A failed renewal can be retried and different sessions remain separate', async () => {
  let calls = 0;
  const refresh = createRefreshCoordinator(
    async () => {
      calls++;
      return { data: null };
    },
    (result) => Boolean(result.data)
  );
  await refresh('first', 'hash1');
  await refresh('first', 'hash1');
  await refresh('second', 'hash2');
  assert.equal(calls, 3);
});
test('A lost mutation response explains uncertainty and never retries automatically', async (context) => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    calls++;
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(
    clientFetch('/api/admin/sales', { method: 'POST' }),
    /comprueba si se guardó/
  );
  assert.equal(calls, 1);
});

test('Variant galleries lead with the chosen option, deduplicate URLs and exclude other variants', () => {
  const { variantImages } = load('src/lib/product-selection.ts');
  const image = (url, isPrimary = false) => ({ id: url, url, position: 0, isPrimary });
  const beige = { id: 'beige', images: [image('beige.jpg', true), image('shared.jpg')] };
  const grey = { id: 'grey', images: [image('grey.jpg')] };
  const product = { images: [image('shared.jpg', true), image('general.jpg')], variants: [beige, grey] };
  assert.deepEqual(variantImages(product, beige).map(i => i.url), ['beige.jpg', 'shared.jpg', 'general.jpg']);
  assert.deepEqual(variantImages(product).map(i => i.url), ['shared.jpg', 'general.jpg']);
});

test('Cloudinary sizes are centralized and arbitrary or signed hosts are preserved', () => {
  const { cloudinaryImageUrl } = load('src/lib/cloudinary.ts');
  assert.equal(cloudinaryImageUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg', {width:750}), 'https://res.cloudinary.com/demo/image/upload/w_750,c_limit,q_auto,f_auto/v1/a.jpg');
  for (const url of ['https://example.com/a.jpg', 'https://res.cloudinary.com/demo/image/upload/s--signed--/v1/a.jpg']) assert.equal(cloudinaryImageUrl(url, {width:200}), url);
});

test('Numeric catalog IDs are normalized for variant deep links', () => {
  const { normalizeCatalogProduct } = load('src/lib/catalog.ts');
  const product = normalizeCatalogProduct({id:1, variants:[{id:2, images:[{id:3}]}]});
  assert.equal(product.id, '1'); assert.equal(product.variants[0].id, '2'); assert.equal(product.variants[0].images[0].id, '3');
});

test('Editing a variant preserves a cost omitted by financial permissions and keeps explicit nullable cost edits', () => {
  const { variantCostPatch } = load('src/lib/admin-catalog-utils.ts');
  assert.deepEqual(variantCostPatch({}, null), {});
  assert.deepEqual(variantCostPatch({ estimatedCost: '100.00' }, 50), { estimatedCost: 50 });
  assert.deepEqual(variantCostPatch({ estimatedCost: '100.00' }, null), { estimatedCost: null });
  assert.deepEqual(variantCostPatch(null, 50), { estimatedCost: 50 });
});
