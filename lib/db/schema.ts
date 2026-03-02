import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import type { Component, Theme, ProfileEntry } from '@/types';

// ── Consultants ──────────────────────────────────────────────────────────────

export const consultants = pgTable('consultants', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  headline: varchar('headline', { length: 500 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  location: varchar('location', { length: 255 }),
  summary: text('summary'),
  photoUrl: varchar('photo_url', { length: 1000 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const profileSections = pgTable('profile_sections', {
  id: text('id').primaryKey(),
  consultantId: text('consultant_id')
    .notNull()
    .references(() => consultants.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  entries: jsonb('entries').notNull().$type<ProfileEntry[]>(),
  order: integer('order').notNull().default(0),
});

// ── Opportunities ────────────────────────────────────────────────────────────

export const opportunities = pgTable('opportunities', {
  id: text('id').primaryKey(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  roleTitle: varchar('role_title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  requirements: text('requirements'),
  deadline: varchar('deadline', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const consultantGuidance = pgTable('consultant_guidance', {
  id: text('id').primaryKey(),
  opportunityId: text('opportunity_id')
    .notNull()
    .references(() => opportunities.id, { onDelete: 'cascade' }),
  consultantId: text('consultant_id')
    .notNull()
    .references(() => consultants.id, { onDelete: 'cascade' }),
  guidance: text('guidance').notNull(),
});

// ── Templates & Rulesets ─────────────────────────────────────────────────────

export const cvTemplates = pgTable('cv_templates', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  /** Canvas-compatible HTML section components — same format as Blitz generates */
  components: jsonb('components').notNull().$type<Component[]>(),
  isBuiltIn: boolean('is_built_in').notNull().default(false),
  theme: jsonb('theme').$type<Theme>(),
});

export const rulesets = pgTable('rulesets', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  rules: jsonb('rules').notNull().$type<string[]>(),
});

// ── CV Versions ──────────────────────────────────────────────────────────────

export const cvVersions = pgTable('cv_versions', {
  id: text('id').primaryKey(),
  consultantId: text('consultant_id')
    .notNull()
    .references(() => consultants.id, { onDelete: 'cascade' }),
  templateId: text('template_id').references(() => cvTemplates.id, { onDelete: 'set null' }),
  opportunityId: text('opportunity_id').references(() => opportunities.id, { onDelete: 'set null' }),
  rulesetIds: jsonb('ruleset_ids').$type<string[]>(),
  /** Canvas-compatible HTML section components — the generated CV content */
  components: jsonb('components').notNull().$type<Component[]>(),
  theme: jsonb('theme').notNull().$type<Theme>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  parentVersionId: text('parent_version_id'),
});

// ── Inferred types ───────────────────────────────────────────────────────────

export type ConsultantRow = typeof consultants.$inferSelect;
export type NewConsultant = typeof consultants.$inferInsert;
export type ProfileSectionRow = typeof profileSections.$inferSelect;
export type NewProfileSection = typeof profileSections.$inferInsert;
export type OpportunityRow = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type ConsultantGuidanceRow = typeof consultantGuidance.$inferSelect;
export type CVTemplateRow = typeof cvTemplates.$inferSelect;
export type NewCVTemplate = typeof cvTemplates.$inferInsert;
export type RulesetRow = typeof rulesets.$inferSelect;
export type NewRuleset = typeof rulesets.$inferInsert;
export type CVVersionRow = typeof cvVersions.$inferSelect;
export type NewCVVersion = typeof cvVersions.$inferInsert;
