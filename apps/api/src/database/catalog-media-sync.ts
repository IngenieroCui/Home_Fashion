import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { QueryTypes } from 'sequelize';
import { catalogMediaManifest } from './demo/catalog-media-manifest';
import { createStandaloneConnection } from './standalone.connection';
import { CloudinaryMediaService } from '../modules/media/cloudinary-media.service';

type ProductRow = { id: string };
type ImageRow = { id: string; url: string; publicId: string | null };

async function main() {
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');
  const selection = process.argv.filter((arg) => arg.startsWith('--products='));
  if (selection.length > 1) throw new Error('Usa una sola lista --products=slug,slug');
  const slugs = selection.length ? selection[0].slice('--products='.length).split(',').map((slug) => slug.trim()) : [];
  if (slugs.some((slug) => !slug)) throw new Error('La lista de productos no puede estar vacía');
  const unknown = slugs.filter((slug) => !catalogMediaManifest.some((entry) => entry.productSlug === slug));
  if (unknown.length) throw new Error(`Productos fuera del manifest: ${unknown.join(', ')}`);
  if (apply && process.argv.includes('--dry-run')) throw new Error('Elige --dry-run o --apply');
  const entries = slugs.length ? catalogMediaManifest.filter((entry) => slugs.includes(entry.productSlug)) : catalogMediaManifest;
  if (process.argv.some((arg) => arg.startsWith('--') && !arg.startsWith('--products=') && !['--apply', '--dry-run', '--force'].includes(arg))) throw new Error('Usa --dry-run o --apply, opcionalmente --force y --products=slug,slug');
  const { sequelize } = await createStandaloneConnection();
  const media = new CloudinaryMediaService(new ConfigService(process.env));
  let missing = 0, planned = 0, skipped = 0, uploaded = 0;
  try {
    // Preflight every selected product before any upload or database mutation.
    for (const slug of new Set(entries.map((entry) => entry.productSlug))) {
      const rows = await sequelize.query<ProductRow>('SELECT id FROM products WHERE slug = :slug LIMIT 1', { replacements: { slug }, type: QueryTypes.SELECT });
      if (!rows.length) throw new Error(`Producto ausente: ${slug}`);
    }
    for (const entry of entries) {
      const [product] = await sequelize.query<ProductRow>('SELECT id FROM products WHERE slug = :slug LIMIT 1', { replacements: { slug: entry.productSlug }, type: QueryTypes.SELECT });
      if (!product) { console.info(`${entry.productSlug}: producto ausente`); missing++; continue; }
      const publicId = `${media.folder('products', entry.productSlug)}/${String(entry.position + 1).padStart(2, '0')}-${entry.isPrimary ? 'main' : 'ambient'}`;
      const rows = await sequelize.query<ImageRow>(
        'SELECT id, url, public_id AS publicId FROM product_images WHERE product_id = :productId AND (public_id = :publicId OR (public_id IS NULL AND url LIKE :legacyUrl)) ORDER BY id ASC LIMIT 1',
        { replacements: { productId: product.id, publicId, legacyUrl: `%/catalog/${entry.productSlug}.webp%` }, type: QueryTypes.SELECT }
      );
      const existing = rows[0];
      if (existing?.publicId === publicId && !force) { skipped++; console.info(`${entry.productSlug} #${entry.position + 1}: sincronizada`); continue; }
      console.info(`${entry.productSlug} #${entry.position + 1}: ${existing ? 'actualizaría' : 'subiría'} ${entry.localPath ?? entry.sourcePageUrl}`);
      planned++;
      if (!apply) continue;
      let buffer: Buffer; let mimetype: string;
      if (entry.localPath) {
        buffer = await readFile(resolve(__dirname, '../../../..', entry.localPath));
        mimetype = 'image/webp';
      } else {
        const response = await fetch(entry.sourceAssetUrl!, { headers: { 'user-agent': 'HomeFashionThesisDemo/1.0' }, signal: AbortSignal.timeout(45000) });
        if (!response.ok) throw new Error(`No se pudo descargar ${entry.sourcePageUrl}: HTTP ${response.status}`);
        mimetype = response.headers.get('content-type')?.split(';')[0] ?? '';
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimetype)) throw new Error(`Formato de fuente inválido: ${entry.sourcePageUrl}`);
        buffer = Buffer.from(await response.arrayBuffer());
        // Some original Unsplash files exceed Cloudinary's 10 MB input limit.
        // Request the same source at the intended catalogue resolution.
        if (buffer.length > 10 * 1024 * 1024) {
          const resized = new URL(response.url);
          if (resized.hostname !== 'images.unsplash.com') throw new Error('La fuente supera 10 MB');
          resized.searchParams.set('w', '2000'); resized.searchParams.set('h', '2000');
          resized.searchParams.set('fit', 'max'); resized.searchParams.set('fm', 'webp'); resized.searchParams.set('q', '85');
          const smaller = await fetch(resized, { signal: AbortSignal.timeout(45000) });
          if (!smaller.ok) throw new Error('No se pudo reducir la fuente de imagen');
          mimetype = smaller.headers.get('content-type')?.split(';')[0] ?? '';
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimetype)) throw new Error('Formato de fuente reducido inválido');
          buffer = Buffer.from(await smaller.arrayBuffer());
          if (buffer.length > 10 * 1024 * 1024) throw new Error('La fuente reducida todavía supera 10 MB');
        }
      }
      const basename = publicId.split('/').at(-1)!;
      const result = await media.uploadImage({ buffer, mimetype, originalname: `${basename}.webp` }, 'products', entry.productSlug, basename, true);
      try {
        if (existing) await sequelize.query('UPDATE product_images SET url = :url, public_id = :publicId, alt_text = :altText, position = :position, is_primary = :isPrimary, updated_at = NOW() WHERE id = :id', { replacements: { url: result.secureUrl, publicId: result.publicId, altText: entry.altText, position: entry.position, isPrimary: entry.isPrimary, id: existing.id }, type: QueryTypes.UPDATE });
        else await sequelize.query('INSERT INTO product_images (product_id, product_variant_id, url, public_id, alt_text, position, is_primary, created_at, updated_at) VALUES (:productId, NULL, :url, :publicId, :altText, :position, :isPrimary, NOW(), NOW())', { replacements: { productId: product.id, url: result.secureUrl, publicId: result.publicId, altText: entry.altText, position: entry.position, isPrimary: entry.isPrimary }, type: QueryTypes.INSERT });
        if (existing && !existing.publicId && existing.url.includes('/catalog/')) {
          for (const table of ['quote_items', 'sale_items', 'order_items']) {
            await sequelize.query(`UPDATE \`${table}\` SET image_url_snapshot = :newUrl WHERE image_url_snapshot = :oldUrl`, { replacements: { newUrl: result.secureUrl, oldUrl: existing.url }, type: QueryTypes.UPDATE });
          }
        }
        uploaded++;
      } catch (error) {
        if (existing?.publicId !== publicId) await media.destroy(result.publicId).catch(() => undefined);
        throw error;
      }
    }
    console.info(`Manifest: ${entries.length} imágenes seleccionadas; productos ausentes: ${missing}; ya sincronizadas: ${skipped}; pendientes: ${planned}; aplicadas: ${uploaded}.`);
  } finally { await sequelize.close(); }
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
