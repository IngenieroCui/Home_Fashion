import { Transform } from 'class-transformer';
import { IsInt, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import type { Sequelize, Transaction } from 'sequelize';

export class InventoryAdjustmentDto {
  @IsInt() @Min(0) @Max(2147483647) quantityOnHand!: number;
  @IsInt() @Min(0) @Max(2147483647) expectedQuantity!: number;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 300) reason!: string;
  @IsUUID('4') requestId!: string;
}

export function recordInventoryMovement(
  db: Sequelize, transaction: Transaction, movement: {
    variantId: string; actorId: string; kind: 'INITIAL' | 'ADJUSTMENT' | 'DELIVERY';
    before: number; after: number; reason: string; reference: string
  }
) {
  const { variantId, actorId, kind, before, after, reason, reference } = movement;
  return db.query(
    'INSERT INTO inventory_movements (variant_id, actor_id, kind, delta, previous_quantity, next_quantity, reason, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
    { replacements: [variantId, actorId, kind, after - before, before, after, reason, reference], transaction }
  );
}
