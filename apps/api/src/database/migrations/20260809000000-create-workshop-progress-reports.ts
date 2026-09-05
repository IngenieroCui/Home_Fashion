import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const reference = (model: string, allowNull = false) => ({ type: DataTypes.BIGINT.UNSIGNED, allowNull, references: { model, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' });

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable('workshop_progress_reports', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      workshop_job_id: reference('workshop_jobs'),
      type: { type: DataTypes.ENUM('STARTED', 'PROGRESS', 'READY_FOR_REVIEW'), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      progress_percent: DataTypes.INTEGER.UNSIGNED,
      evidence_urls: DataTypes.JSON,
      review_status: { type: DataTypes.ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING_REVIEW' },
      submitted_by_user_id: reference('users'),
      submitted_at: { type: DataTypes.DATE, allowNull: false },
      reviewed_by_user_id: reference('users', true),
      reviewed_at: DataTypes.DATE,
      review_comment: DataTypes.TEXT,
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction });
    await context.addIndex('workshop_progress_reports', ['workshop_job_id'], { transaction });
    await context.addIndex('workshop_progress_reports', ['review_status'], { transaction });
    await context.addIndex('workshop_progress_reports', ['type'], { transaction });
    await context.addIndex('workshop_progress_reports', ['submitted_at'], { transaction });
  });
};

export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('workshop_progress_reports', { transaction });
  });
};
