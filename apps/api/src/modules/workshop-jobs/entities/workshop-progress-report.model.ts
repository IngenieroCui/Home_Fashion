import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';
import { WorkshopJob } from './workshop-job.model';
import { WorkshopProgressReportType, WorkshopProgressReviewStatus } from '../workshop-jobs.types';

@Table({ tableName: 'workshop_progress_reports', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class WorkshopProgressReport extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }) declare id: string;
  @ForeignKey(() => WorkshopJob)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'workshop_job_id' }) declare workshopJobId: string;
  @Column({ type: DataType.ENUM(...Object.values(WorkshopProgressReportType)), allowNull: false }) declare type: WorkshopProgressReportType;
  @Column({ type: DataType.TEXT, allowNull: false }) declare message: string;
  @Column({ type: DataType.INTEGER.UNSIGNED, field: 'progress_percent' }) declare progressPercent: number | null;
  @Column({ type: DataType.JSON, field: 'evidence_urls' }) declare evidenceUrls: string[] | null;
  @Column({ type: DataType.ENUM(...Object.values(WorkshopProgressReviewStatus)), allowNull: false, defaultValue: WorkshopProgressReviewStatus.PENDING_REVIEW, field: 'review_status' }) declare reviewStatus: WorkshopProgressReviewStatus;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'submitted_by_user_id' }) declare submittedByUserId: string;
  @Column({ type: DataType.DATE, allowNull: false, field: 'submitted_at' }) declare submittedAt: Date;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, field: 'reviewed_by_user_id' }) declare reviewedByUserId: string | null;
  @Column({ type: DataType.DATE, field: 'reviewed_at' }) declare reviewedAt: Date | null;
  @Column({ type: DataType.TEXT, field: 'review_comment' }) declare reviewComment: string | null;
  @BelongsTo(() => WorkshopJob) declare workshopJob?: WorkshopJob;
  @BelongsTo(() => User, 'submittedByUserId') declare submittedByUser?: User;
  @BelongsTo(() => User, 'reviewedByUserId') declare reviewedByUser?: User;
}
