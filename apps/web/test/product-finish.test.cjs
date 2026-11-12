const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { cloudinarySrcSet, cloudinaryImageUrl } = load('src/lib/cloudinary.ts');
const { activePublicHref } = load('src/lib/public-navigation.ts');
const { isReferenceImage } = load('src/lib/reference-image.ts');
const { formatMoney, formatDate, formatDateTime } = load('src/lib/formatters.ts');
test('Responsive image candidates deduplicate widths, preserve paths and skip unsafe delivery types', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v1/sofa.webp';
  const set = cloudinarySrcSet(url, [900, 360, 360, -1, NaN, 540]);
  assert.equal(set.split(', ').length, 3);
  assert.ok(set.includes('w_360,c_limit,q_auto,f_auto/v1/sofa.webp 360w'));
  assert.match(set, /900w$/);
  assert.equal(cloudinarySrcSet('https://example.com/image/upload/a.jpg', [360]), undefined);
  assert.equal(
    cloudinarySrcSet('https://res.cloudinary.com/demo/image/upload/s--signature--/v1/a.jpg', [360]),
    undefined
  );
  assert.equal(cloudinaryImageUrl(url, { width: NaN }), url);
});
test('Public navigation selects one active category with combined filters and unrelated queries', () => {
  const href = (query) => activePublicHref('/catalogo', new URLSearchParams(query));
  assert.equal(href('allowsCustomization=true'), '/catalogo?allowsCustomization=true');
  assert.equal(href('inStock=true'), '/catalogo?inStock=true');
  assert.equal(href('inStock=true&allowsCustomization=true'), '/catalogo?allowsCustomization=true');
  assert.equal(href('q=sofa&allowsCustomization=false'), '/catalogo');
  assert.equal(activePublicHref('/', new URLSearchParams('inStock=true')), '/');
});
test('Reference disclosure recognizes both demo manifests without flagging own photography', () => {
  assert.equal(isReferenceImage({ altText: 'Referencia visual de Sofá Verona' }), true);
  assert.equal(isReferenceImage({ altText: 'Imagen ilustrativa de sofá' }), true);
  assert.equal(isReferenceImage({ altText: 'Fotografía Home Fashion' }), false);
  assert.equal(isReferenceImage(undefined), false);
});
test('COP retains cents and date-only values retain their calendar day in Colombia', () => {
  assert.match(formatMoney('1250000.5'), /,5/);
  assert.equal(formatMoney(' '), '—');
  assert.equal(formatMoney('invalid'), '—');
  assert.equal(formatDate('2026-09-29'), formatDate('2026-09-29T12:00:00Z'));
  assert.equal(formatDateTime('invalid'), '—');
});

const { normalizeSelectRecord } = load('src/lib/select-record.ts');
test('Numeric commerce IDs match HTML selections and retain variant details for draft editing', () => {
  const raw = { id: 23, name: 'Sofá', variants: [{ id: 7, name: 'Gris', salePrice: '3299000' }] };
  const product = normalizeSelectRecord(raw);
  assert.equal(product.id, '23');
  assert.equal(product.variants.find((variant) => variant.id === '7').salePrice, '3299000');
  assert.equal(raw.id, 23);
  assert.equal(raw.variants[0].id, 7);
});
