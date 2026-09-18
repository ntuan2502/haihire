#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7744c762870196749db0d32259d0b86fcccb18461369236a1c469f304f66ca2f/contract';
import startContract from '../../snapshots/7744c762870196749db0d32259d0b86fcccb18461369236a1c469f304f66ca2f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/bab6f663880e08dab741ed66896c068a5a0d271d69343750365f5add85cc1c79/contract';
import endContract from '../../snapshots/bab6f663880e08dab741ed66896c068a5a0d271d69343750365f5add85cc1c79/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  placeholder,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'post' }),
      this.dropDefault({ schema: 'public', table: 'user', column: 'id' }),
      this.dropColumn({ schema: 'public', table: 'user', column: 'username' }),
      this.createTable({
        schema: 'public',
        table: 'activityLog',
        columns: [
          col('actorId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('actorName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorRole', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('applicationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('candidateId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'activityLog_type_check_fbd4cb01',
            "\"type\" IN ('APPLIED', 'STAGE_CHANGED', 'EMAIL_SENT', 'INTERVIEW_SCHEDULED', 'INTERVIEW_UPDATED', 'SCORECARD_SUBMITTED', 'NOTE_ADDED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'application',
        columns: [
          col('candidateId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('jobId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('matchScore', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('orderIndex', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('resumeFileName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resumeFileSize', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('resumeMimeType', 'text', {
            default: lit('application/pdf'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('resumeUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stage', 'text', {
            notNull: true,
            default: lit('APPLIED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'application_stage_check_6a822e91',
            "\"stage\" IN ('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'candidate',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('dateOfBirth', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('gender', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resumeFileName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resumeFileSize', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('resumeMimeType', 'text', {
            default: lit('application/pdf'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('resumeUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'candidate_gender_check_30490488',
            "\"gender\" IN ('MALE', 'FEMALE', 'OTHER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'emailLog',
        columns: [
          col('applicationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('candidateId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('errorMessage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recipientEmail', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recipientName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('senderEmail', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('senderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('senderName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sentAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('SENT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subject', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('templateType', 'text', {
            notNull: true,
            default: lit('CUSTOM'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'emailLog_status_check_5d366a78',
            "\"status\" IN ('SENT', 'SIMULATED', 'FAILED')",
          ),
          checkExpression(
            'emailLog_templateType_check_ac874270',
            "\"templateType\" IN ('APPLICATION_CONFIRMATION', 'INTERVIEW_INVITATION', 'REJECTION', 'OFFER', 'CUSTOM')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'emailSetting',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('fromEmail', 'text', {
            notNull: true,
            default: lit('careers@workspace.com'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('fromName', 'text', {
            notNull: true,
            default: lit('Recruitment Team'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', {
            notNull: true,
            default: lit('SIMULATED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('resendApiKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sendgridApiKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('smtpHost', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('smtpPass', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('smtpPort', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('smtpSecure', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('smtpUser', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'emailTemplate',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('enabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('subject', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('variables', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'emailTemplate_type_check_1e067137',
            "\"type\" IN ('APPLICATION_CONFIRMATION', 'INTERVIEW_INVITATION', 'REJECTION', 'OFFER', 'CUSTOM')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'interview',
        columns: [
          col('applicationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('date', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('format', 'text', {
            notNull: true,
            default: lit('MEET'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('interviewer', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('linkOrLocation', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('round', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('scorecard', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('time', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', {
            notNull: true,
            default: lit('TECHNICAL'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'interview_format_check_581367dc',
            "\"format\" IN ('MEET', 'ZOOM', 'TEAMS', 'OFFICE')",
          ),
          checkExpression(
            'interview_type_check_710710c6',
            "\"type\" IN ('HR_SCREENING', 'TECHNICAL', 'CULTURE_FIT', 'FINAL_ROUND', 'ASSESSMENT')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'inviteLink',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxUses', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('MEMBER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('usesCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('inviteLink_role_check_ddb31015', "\"role\" IN ('ADMIN', 'MEMBER')"),
          checkExpression(
            'inviteLink_status_check_4a183461',
            "\"status\" IN ('ACTIVE', 'EXPIRED', 'REVOKED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'job',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('department', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('experienceLevel', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('location', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('postalCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requirements', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('salaryRange', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PUBLISHED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', {
            notNull: true,
            default: lit('FULL_TIME'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('workplace', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'job_experienceLevel_check_c0bba8bd',
            "\"experienceLevel\" IN ('ENTRY_LEVEL', 'MID_LEVEL', 'SENIOR_LEVEL', 'LEAD', 'EXECUTIVE')",
          ),
          checkExpression(
            'job_status_check_aaf19bbb',
            "\"status\" IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')",
          ),
          checkExpression(
            'job_type_check_11718726',
            "\"type\" IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP')",
          ),
          checkExpression(
            'job_workplace_check_e95ad321',
            "\"workplace\" IN ('ON_SITE', 'HYBRID', 'REMOTE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'organization',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'organizationMember',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('MEMBER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'organizationMember_role_check_ddb31015',
            "\"role\" IN ('ADMIN', 'MEMBER')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('avatarUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('organizationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('password', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('role', 'text', {
          notNull: true,
          default: lit('MEMBER'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.dataTransform(endContract, 'typechange-user-id', {
        check: () => placeholder('typechange-user-id:check'),
        run: () => placeholder('typechange-user-id:run'),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'user',
        column: 'id',
        options: {
          qualifiedTargetType: 'text',
          formatTypeExpected: 'text',
          rawTargetTypeForLabel: 'text',
        },
      }),
      this.dataTransform(endContract, 'handle-nulls-user-name', {
        check: () => placeholder('handle-nulls-user-name:check'),
        run: () => placeholder('handle-nulls-user-name:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'user', column: 'name' }),
      this.addUnique({
        schema: 'public',
        table: 'application',
        constraint: 'application_candidateId_jobId_key',
        columns: ['candidateId', 'jobId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'candidate',
        constraint: 'candidate_organizationId_email_key',
        columns: ['organizationId', 'email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'emailSetting',
        constraint: 'emailSetting_organizationId_key',
        columns: ['organizationId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'emailTemplate',
        constraint: 'emailTemplate_organizationId_type_key',
        columns: ['organizationId', 'type'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'inviteLink',
        constraint: 'inviteLink_token_key',
        columns: ['token'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'organization',
        constraint: 'organization_slug_key',
        columns: ['slug'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_role_check_ddb31015',
        expression: "\"role\" IN ('ADMIN', 'MEMBER')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'activityLog',
        index: 'activityLog_applicationId_idx_8158f91a',
        columns: ['applicationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'activityLog',
        index: 'activityLog_candidateId_idx_462b5869',
        columns: ['candidateId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'activityLog',
        index: 'activityLog_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'application',
        index: 'application_candidateId_idx_462b5869',
        columns: ['candidateId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'application',
        index: 'application_jobId_idx_623c8f77',
        columns: ['jobId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'candidate',
        index: 'candidate_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'emailLog',
        index: 'emailLog_applicationId_idx_8158f91a',
        columns: ['applicationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'emailLog',
        index: 'emailLog_candidateId_idx_462b5869',
        columns: ['candidateId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'emailLog',
        index: 'emailLog_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'emailTemplate',
        index: 'emailTemplate_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'interview',
        index: 'interview_applicationId_idx_8158f91a',
        columns: ['applicationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inviteLink',
        index: 'inviteLink_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inviteLink',
        index: 'inviteLink_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'job',
        index: 'job_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'job',
        index: 'job_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organizationMember',
        index: 'organizationMember_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organizationMember',
        index: 'organizationMember_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user',
        index: 'user_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'activityLog',
        foreignKey: {
          name: 'activityLog_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'activityLog',
        foreignKey: {
          name: 'activityLog_candidateId_fkey',
          columns: ['candidateId'],
          references: { schema: 'public', table: 'candidate', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'activityLog',
        foreignKey: {
          name: 'activityLog_applicationId_fkey',
          columns: ['applicationId'],
          references: { schema: 'public', table: 'application', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'application',
        foreignKey: {
          name: 'application_candidateId_fkey',
          columns: ['candidateId'],
          references: { schema: 'public', table: 'candidate', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'application',
        foreignKey: {
          name: 'application_jobId_fkey',
          columns: ['jobId'],
          references: { schema: 'public', table: 'job', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'candidate',
        foreignKey: {
          name: 'candidate_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'emailLog',
        foreignKey: {
          name: 'emailLog_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'emailLog',
        foreignKey: {
          name: 'emailLog_candidateId_fkey',
          columns: ['candidateId'],
          references: { schema: 'public', table: 'candidate', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'emailLog',
        foreignKey: {
          name: 'emailLog_applicationId_fkey',
          columns: ['applicationId'],
          references: { schema: 'public', table: 'application', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'emailSetting',
        foreignKey: {
          name: 'emailSetting_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'emailTemplate',
        foreignKey: {
          name: 'emailTemplate_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'interview',
        foreignKey: {
          name: 'interview_applicationId_fkey',
          columns: ['applicationId'],
          references: { schema: 'public', table: 'application', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inviteLink',
        foreignKey: {
          name: 'inviteLink_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inviteLink',
        foreignKey: {
          name: 'inviteLink_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'job',
        foreignKey: {
          name: 'job_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'job',
        foreignKey: {
          name: 'job_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationMember',
        foreignKey: {
          name: 'organizationMember_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationMember',
        foreignKey: {
          name: 'organizationMember_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user',
        foreignKey: {
          name: 'user_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
