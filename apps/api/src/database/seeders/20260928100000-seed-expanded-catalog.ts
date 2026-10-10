import { QueryTypes, type Transaction } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

type Demo = [
  category: string,
  slug: string,
  name: string,
  description: string,
  price: number,
  stock: number,
  custom: boolean,
  material: string,
  color: string,
  dimensions: string
];
const categories = [
  ['salas', 'Salas', 'Conjuntos para reunirse y descansar.'],
  ['sillas', 'Sillas', 'Asientos para cada rincón del hogar.'],
  ['mesas', 'Mesas', 'Superficies para compartir y crear.'],
  ['poltronas', 'Poltronas', 'Una pausa cómoda con carácter.'],
  ['auxiliares', 'Muebles auxiliares', 'Detalles funcionales para completar espacios.'],
  ['decoracion', 'Decoración', 'Acentos cálidos para la casa.']
] as const;
const products: Demo[] = [
  [
    'sofas',
    'sofa-lisboa',
    'Sofá Lisboa',
    'Sofá compacto de dos puestos con brazos curvos; ideal para salas de conversación.',
    2490000,
    2,
    true,
    'Madera y tapizado',
    'Arena',
    '175 × 86 × 80 cm'
  ],
  [
    'sofas',
    'sofa-camelia',
    'Sofá Camelia',
    'Sofá de tres puestos con asiento profundo y perfil contemporáneo.',
    3790000,
    0,
    true,
    'Madera y tapizado',
    'Terracota',
    '226 × 94 × 83 cm'
  ],
  [
    'sofas',
    'sofa-praga',
    'Sofá Praga',
    'Diseño modular de líneas rectas para una sala flexible.',
    4590000,
    1,
    true,
    'Madera y tapizado',
    'Gris cálido',
    '245 × 95 × 76 cm'
  ],
  [
    'sofas',
    'sofa-porto',
    'Sofá Porto',
    'Sofá de dos puestos con patas de madera a la vista.',
    2190000,
    3,
    false,
    'Madera y tela',
    'Crema',
    '168 × 84 × 78 cm'
  ],
  [
    'salas',
    'sala-toscana',
    'Sala Toscana',
    'Conjunto de sofá y poltrona pensado para recibir con comodidad.',
    5390000,
    0,
    true,
    'Madera y tapizado',
    'Piedra',
    'Variable'
  ],
  [
    'salas',
    'sala-oliva',
    'Sala Oliva',
    'Composición acogedora con sofá y mesa central de acento natural.',
    4890000,
    1,
    true,
    'Madera y tela',
    'Oliva',
    'Variable'
  ],
  [
    'salas',
    'sala-malaga',
    'Sala Málaga',
    'Conjunto de tres piezas de silueta suave para espacios amplios.',
    6290000,
    0,
    true,
    'Madera y tela',
    'Marfil',
    'Variable'
  ],
  [
    'comedores',
    'comedor-ambar',
    'Comedor Ámbar',
    'Mesa redonda con cuatro sillas para encuentros cotidianos.',
    3490000,
    2,
    true,
    'Madera',
    'Miel',
    '120 cm diámetro'
  ],
  [
    'comedores',
    'comedor-viena',
    'Comedor Viena',
    'Mesa de seis puestos con estructura ligera y sillas tapizadas.',
    4690000,
    0,
    true,
    'Madera y tapizado',
    'Nogal',
    '180 × 90 × 75 cm'
  ],
  [
    'comedores',
    'comedor-cedro',
    'Comedor Cedro',
    'Mesa rectangular de ocho puestos para reuniones familiares.',
    5990000,
    1,
    false,
    'Madera',
    'Natural',
    '220 × 95 × 75 cm'
  ],
  [
    'comedores',
    'comedor-lima',
    'Comedor Lima',
    'Conjunto compacto de cuatro puestos para apartamentos.',
    2890000,
    4,
    false,
    'Madera',
    'Roble claro',
    '110 × 75 × 75 cm'
  ],
  [
    'dormitorios',
    'cama-roma',
    'Cama Roma',
    'Cama queen con cabecero tapizado de líneas serenas.',
    3190000,
    0,
    true,
    'Madera y tapizado',
    'Beige',
    '160 × 190 cm'
  ],
  [
    'dormitorios',
    'cama-luna',
    'Cama Luna',
    'Cama doble de perfil bajo con cabecero de madera.',
    2490000,
    2,
    true,
    'Madera',
    'Natural',
    '140 × 190 cm'
  ],
  [
    'dormitorios',
    'alcoba-florencia',
    'Alcoba Florencia',
    'Conjunto de cama y mesas de noche con acabado cálido.',
    5290000,
    0,
    true,
    'Madera',
    'Nogal',
    'Queen'
  ],
  [
    'dormitorios',
    'alcoba-nogal',
    'Alcoba Nogal',
    'Conjunto de dormitorio con cama y dos auxiliares.',
    4790000,
    1,
    false,
    'Madera',
    'Nogal',
    'Doble'
  ],
  [
    'sillas',
    'silla-mila',
    'Silla Mila',
    'Silla de comedor de respaldo envolvente y asiento tapizado.',
    690000,
    8,
    true,
    'Madera y tapizado',
    'Crema',
    '48 × 52 × 82 cm'
  ],
  [
    'sillas',
    'silla-bruna',
    'Silla Bruna',
    'Silla de acento con estructura en madera y tejido claro.',
    790000,
    3,
    false,
    'Madera y tela',
    'Natural',
    '50 × 55 × 78 cm'
  ],
  [
    'sillas',
    'silla-elisa',
    'Silla Elisa',
    'Asiento ligero para comedor o escritorio doméstico.',
    590000,
    12,
    false,
    'Madera',
    'Oliva',
    '46 × 50 × 80 cm'
  ],
  [
    'mesas',
    'mesa-aurora',
    'Mesa Aurora',
    'Mesa de centro ovalada con cubierta en madera.',
    1190000,
    2,
    true,
    'Madera',
    'Miel',
    '110 × 60 × 42 cm'
  ],
  [
    'mesas',
    'mesa-siena',
    'Mesa Siena',
    'Mesa redonda de comedor para cuatro personas.',
    2290000,
    0,
    true,
    'Madera',
    'Natural',
    '120 cm diámetro'
  ],
  [
    'mesas',
    'mesa-rio',
    'Mesa Río',
    'Mesa lateral de dos niveles para sala o dormitorio.',
    680000,
    5,
    false,
    'Madera',
    'Nogal',
    '48 × 48 × 55 cm'
  ],
  [
    'mesas',
    'mesa-monte',
    'Mesa Monte',
    'Mesa rectangular con cubierta amplia y base robusta.',
    2590000,
    1,
    true,
    'Madera',
    'Roble',
    '180 × 85 × 75 cm'
  ],
  [
    'poltronas',
    'poltrona-siena',
    'Poltrona Siena',
    'Poltrona de respaldo curvo para crear un rincón de lectura.',
    1390000,
    2,
    true,
    'Madera y tapizado',
    'Arena',
    '78 × 82 × 79 cm'
  ],
  [
    'poltronas',
    'poltrona-roma',
    'Poltrona Roma',
    'Poltrona de brazos anchos y asiento generoso.',
    1690000,
    0,
    true,
    'Madera y tela',
    'Terracota',
    '88 × 88 × 80 cm'
  ],
  [
    'poltronas',
    'poltrona-nube',
    'Poltrona Nube',
    'Asiento envolvente con textura suave y base discreta.',
    1490000,
    3,
    false,
    'Madera y tela',
    'Marfil',
    '80 × 78 × 76 cm'
  ],
  [
    'auxiliares',
    'mesa-noche-alba',
    'Mesa de noche Alba',
    'Dos cajones y cubierta de madera para lo esencial.',
    790000,
    5,
    true,
    'Madera',
    'Natural',
    '50 × 40 × 55 cm'
  ],
  [
    'auxiliares',
    'mesa-noche-lino',
    'Mesa de noche Lino',
    'Auxiliar compacta con un cajón y espacio abierto.',
    650000,
    3,
    false,
    'Madera',
    'Blanco cálido',
    '45 × 38 × 52 cm'
  ],
  [
    'auxiliares',
    'consola-verona',
    'Consola Verona',
    'Consola estilizada para recibidor o sala.',
    1290000,
    1,
    true,
    'Madera',
    'Nogal',
    '120 × 38 × 80 cm'
  ],
  [
    'auxiliares',
    'biblioteca-roble',
    'Biblioteca Roble',
    'Estantes abiertos para libros y objetos cotidianos.',
    1890000,
    0,
    true,
    'Madera',
    'Roble',
    '90 × 35 × 180 cm'
  ],
  [
    'decoracion',
    'espejo-arcadia',
    'Espejo Arcadia',
    'Espejo de arco con marco de madera para ampliar visualmente el espacio.',
    890000,
    4,
    false,
    'Madera y vidrio',
    'Natural',
    '70 × 110 cm'
  ],
  [
    'decoracion',
    'repisa-savia',
    'Repisa Savia',
    'Repisa flotante para exhibir pequeños objetos.',
    320000,
    7,
    false,
    'Madera',
    'Miel',
    '80 × 20 cm'
  ],
  [
    'decoracion',
    'biombo-oliva',
    'Biombo Oliva',
    'Separador plegable con trama de madera para espacios flexibles.',
    1790000,
    0,
    true,
    'Madera',
    'Oliva',
    '150 × 180 cm'
  ]
];

const findId = async (
  context: Parameters<DatabaseMigration['up']>[0]['context'],
  table: string,
  slug: string,
  transaction: Transaction
) => {
  const rows = await context.sequelize.query<{ id: number }>(
    `SELECT id FROM ${table} WHERE slug = :slug LIMIT 1`,
    { replacements: { slug }, type: QueryTypes.SELECT, transaction }
  );
  return rows[0]?.id;
};

// This showcase is deliberately opt-in for production databases.
const enabled = () =>
  process.env.NODE_ENV !== 'production' || process.env.CATALOG_DEMO_SEED === 'true';

export const up: DatabaseMigration['up'] = async ({ context }) => {
  if (!enabled())
    throw new Error('El catálogo demo ampliado requiere CATALOG_DEMO_SEED=true en producción.');
  const now = new Date();
  await context.sequelize.transaction(async (transaction) => {
    for (const [slug, name, description] of categories) {
      if (!(await findId(context, 'categories', slug, transaction)))
        await context.bulkInsert(
          'categories',
          [{ name, slug, description, is_active: true, created_at: now, updated_at: now }],
          { transaction }
        );
    }
    for (const [
      category,
      slug,
      name,
      description,
      price,
      stock,
      custom,
      material,
      color,
      dimensions
    ] of products) {
      if (await findId(context, 'products', slug, transaction)) continue;
      const categoryId = await findId(context, 'categories', category, transaction);
      if (!categoryId) throw new Error(`Missing demo category: ${category}`);
      await context.bulkInsert(
        'products',
        [
          {
            category_id: categoryId,
            name,
            slug,
            description,
            allows_customization: custom,
            status: 'ACTIVE',
            created_at: now,
            updated_at: now
          }
        ],
        { transaction }
      );
      const productId = await findId(context, 'products', slug, transaction);
      if (!productId) throw new Error(`Could not create ${slug}`);
      await context.bulkInsert(
        'product_variants',
        [
          {
            product_id: productId,
            sku: `DEMO-${slug.toUpperCase()}`,
            name: `${color} · referencia`,
            dimensions,
            material,
            fabric: material.includes('tapizado') || material.includes('tela') ? 'Tela' : null,
            color,
            finish: null,
            sale_price: price,
            estimated_cost: null,
            quantity_on_hand: stock,
            quantity_reserved: 0,
            location: stock ? 'Sala de exposición' : null,
            status: 'ACTIVE',
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
  if (!enabled())
    throw new Error(
      'La reversión del catálogo demo requiere CATALOG_DEMO_SEED=true en producción.'
    );
  await context.sequelize.transaction(async (transaction) => {
    for (const [, slug] of products) {
      const id = await findId(context, 'products', slug, transaction);
      if (!id) continue;
      await context.bulkDelete(
        'product_variants',
        { product_id: id, sku: `DEMO-${slug.toUpperCase()}` },
        { transaction }
      );
      await context.bulkDelete('products', { id, slug }, { transaction });
    }
    for (const [slug] of categories) {
      const id = await findId(context, 'categories', slug, transaction);
      if (id) await context.bulkDelete('categories', { id, slug }, { transaction });
    }
  });
};
