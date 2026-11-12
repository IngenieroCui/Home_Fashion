const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

test('QA-2 catalog pagination retains combined filters in its GET destination', () => {
  const { catalogQuery } = load('src/lib/catalog.ts');
  const query = new URLSearchParams(catalogQuery({ page: 2, category: 'sofas', inStock: true, allowsCustomization: true, minPrice: 100000, maxPrice: 9000000, sort: 'price-desc' }).slice(1));
  assert.equal(query.get('page'), '2');
  assert.equal(query.get('category'), 'sofas');
  assert.equal(query.get('inStock'), 'true');
  assert.equal(query.get('allowsCustomization'), 'true');
  assert.equal(query.get('minPrice'), '100000');
  assert.equal(query.get('maxPrice'), '9000000');
  assert.equal(query.get('sort'), 'price-desc');
});

test('QA-2 numeric customer IDs match native select values', () => {
  const { normalizeSelectRecord } = load('src/lib/select-record.ts');
  const customer = normalizeSelectRecord({ id: 15, fullName: 'QA Customer' });
  assert.equal(customer.id, '15');
  assert.equal(customer.fullName, 'QA Customer');
});
