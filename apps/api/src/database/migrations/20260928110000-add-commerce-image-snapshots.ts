import { DataTypes, QueryTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const tables = ['quote_items', 'sale_items', 'order_items'] as const;

export const up: DatabaseMigration['up'] = async ({ context }) => {
  const query = context.sequelize.getQueryInterface();
  for (const table of tables) {
    if (!(await query.describeTable(table)).image_url_snapshot) {
      await query.addColumn(table, 'image_url_snapshot', { type: DataTypes.STRING(2048), allowNull: true });
    }
    await context.sequelize.query(
      `UPDATE \`${table}\` AS item SET item.image_url_snapshot = (
        SELECT image.url FROM product_images AS image
        WHERE image.product_id = item.product_id
          AND (image.product_variant_id = item.product_variant_id OR image.product_variant_id IS NULL)
        ORDER BY (image.product_variant_id = item.product_variant_id) DESC, image.is_primary DESC, image.position ASC, image.id ASC LIMIT 1
      ) WHERE item.image_url_snapshot IS NULL`, { type: QueryTypes.UPDATE }
    );
  }
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  for (const table of [...tables].reverse()) await context.sequelize.getQueryInterface().removeColumn(table, 'image_url_snapshot');
};
