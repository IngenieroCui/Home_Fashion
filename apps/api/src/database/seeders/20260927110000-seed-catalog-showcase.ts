import { QueryTypes, type Transaction } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

type IdRow = { id: number };
type DemoProduct = {
  slug: string;
  name: string;
  category: string;
  description: string;
  sku: string;
  variant: string;
  dimensions: string;
  material: string;
  fabric?: string;
  color: string;
  price: number;
};

const newProducts: DemoProduct[] = [
  {
    slug: 'sofa-boreal',
    name: 'Sofá Boreal',
    category: 'sofas',
    description:
      'Propuesta de sofá amplio de líneas suaves para una sala acogedora. Puedes solicitar ajustes de medidas, tela y color.',
    sku: 'BOR-3P-BEI',
    variant: 'Tres puestos beige',
    dimensions: '220 × 90 × 82 cm',
    material: 'Estructura de madera',
    fabric: 'Tela texturizada',
    color: 'Beige',
    price: 3490000
  },
  {
    slug: 'sofa-lino',
    name: 'Sofá Lino',
    category: 'sofas',
    description:
      'Diseño de sofá de tres puestos con perfil bajo y acabado cálido. Cotiza la combinación que mejor encaje en tu espacio.',
    sku: 'LIN-3P-ARE',
    variant: 'Tres puestos arena',
    dimensions: '210 × 88 × 80 cm',
    material: 'Estructura de madera',
    fabric: 'Lino',
    color: 'Arena',
    price: 3190000
  },
  {
    slug: 'comedor-roble',
    name: 'Comedor Roble',
    category: 'comedores',
    description:
      'Conjunto de mesa rectangular y sillas tapizadas para compartir en familia. El precio es una referencia de demostración.',
    sku: 'ROB-6P-NAT',
    variant: 'Seis puestos natural',
    dimensions: '180 × 90 × 75 cm',
    material: 'Madera',
    fabric: 'Tapizado claro',
    color: 'Natural',
    price: 4390000
  },
  {
    slug: 'comedor-oliva',
    name: 'Comedor Oliva',
    category: 'comedores',
    description:
      'Concepto de comedor luminoso con sillas tapizadas. Pregunta por materiales y medidas antes de confirmar una propuesta.',
    sku: 'OLI-6P-CLA',
    variant: 'Seis puestos claro',
    dimensions: '175 × 90 × 75 cm',
    material: 'Madera',
    fabric: 'Tapizado claro',
    color: 'Claro',
    price: 4190000
  },
  {
    slug: 'cama-alba',
    name: 'Cama Alba',
    category: 'dormitorios',
    description:
      'Cama tapizada de estilo sereno para dormitorio principal. Se puede consultar otro tamaño, tela o tono.',
    sku: 'ALB-Q-BEI',
    variant: 'Queen beige',
    dimensions: '160 × 190 cm',
    material: 'Estructura de madera',
    fabric: 'Tapizado',
    color: 'Beige',
    price: 2990000
  },
  {
    slug: 'cama-nordica',
    name: 'Cama Nórdica',
    category: 'dormitorios',
    description:
      'Diseño compacto de cama para espacios contemporáneos. Consulta las opciones de fabricación y almacenamiento.',
    sku: 'NOR-D-BLA',
    variant: 'Doble blanco',
    dimensions: '140 × 190 cm',
    material: 'Madera',
    color: 'Blanco',
    price: 2590000
  }
];

const imageSlugs = [
  'sofa-verona',
  'comedor-siena',
  'cama-napoles',
  ...newProducts.map((product) => product.slug)
];

function imageUrl(slug: string): string {
  const base = (process.env.CATALOG_ASSET_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  if (!/^https?:\/\/[^/]+$/i.test(base))
    throw new Error('CATALOG_ASSET_BASE_URL must be an absolute HTTP(S) origin');
  return `${base}/catalog/${slug}.webp`;
}

async function findId(
  context: Parameters<DatabaseMigration['up']>[0]['context'],
  table: string,
  column: string,
  value: string,
  transaction: Transaction
): Promise<number | undefined> {
  const rows = await context.sequelize.query<IdRow>(
    `SELECT id FROM ${table} WHERE ${column} = :value LIMIT 1`,
    { replacements: { value }, type: QueryTypes.SELECT, transaction }
  );
  return rows[0]?.id;
}

export const up: DatabaseMigration['up'] = async ({ context }) => {
  const now = new Date();
  const createdSlugs = new Set<string>();
  await context.sequelize.transaction(async (transaction) => {
    for (const product of newProducts) {
      if (await findId(context, 'products', 'slug', product.slug, transaction)) continue;
      const categoryId = await findId(context, 'categories', 'slug', product.category, transaction);
      if (!categoryId) throw new Error(`Missing catalog category: ${product.category}`);
      await context.bulkInsert(
        'products',
        [
          {
            category_id: categoryId,
            name: product.name,
            slug: product.slug,
            description: product.description,
            allows_customization: true,
            status: 'ACTIVE',
            created_at: now,
            updated_at: now
          }
        ],
        { transaction }
      );
      createdSlugs.add(product.slug);
      const productId = await findId(context, 'products', 'slug', product.slug, transaction);
      if (!productId) throw new Error(`Could not create product ${product.slug}`);
      await context.bulkInsert(
        'product_variants',
        [
          {
            product_id: productId,
            sku: product.sku,
            name: product.variant,
            dimensions: product.dimensions,
            material: product.material,
            fabric: product.fabric ?? null,
            color: product.color,
            sale_price: product.price,
            estimated_cost: null,
            quantity_on_hand: 0,
            quantity_reserved: 0,
            location: null,
            status: 'ACTIVE',
            created_at: now,
            updated_at: now
          }
        ],
        { transaction }
      );
    }

    for (const slug of imageSlugs) {
      if (
        !['sofa-verona', 'comedor-siena', 'cama-napoles'].includes(slug) &&
        !createdSlugs.has(slug)
      )
        continue;
      const productId = await findId(context, 'products', 'slug', slug, transaction);
      if (!productId) throw new Error(`Missing demo product: ${slug}`);
      const url = imageUrl(slug);
      const existing = await context.sequelize.query<IdRow>(
        'SELECT id FROM product_images WHERE product_id = :productId AND product_variant_id IS NULL LIMIT 1',
        { replacements: { productId }, type: QueryTypes.SELECT, transaction }
      );
      if (existing.length) continue; // Preserve images the owner has already uploaded.
      await context.bulkInsert(
        'product_images',
        [
          {
            product_id: productId,
            product_variant_id: null,
            url,
            public_id: null,
            alt_text: `Imagen ilustrativa de ${slug.replaceAll('-', ' ')}`,
            position: 0,
            is_primary: true,
            created_at: now,
            updated_at: now
          }
        ],
        { transaction }
      );
    }
  });
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    for (const slug of imageSlugs) {
      const productId = await findId(context, 'products', 'slug', slug, transaction);
      if (!productId) continue;
      await context.bulkDelete(
        'product_images',
        { product_id: productId, alt_text: `Imagen ilustrativa de ${slug.replaceAll('-', ' ')}` },
        { transaction }
      );
    }
    for (const product of newProducts) {
      const productId = await findId(context, 'products', 'slug', product.slug, transaction);
      if (!productId) continue;
      await context.bulkDelete(
        'product_variants',
        { product_id: productId, sku: product.sku },
        { transaction }
      );
      await context.bulkDelete('products', { id: productId, slug: product.slug }, { transaction });
    }
  });
};
