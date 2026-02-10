import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const visitedVacancies = pgTable('visited_vacancies', {
  id: serial('id').primaryKey(),
  vacancyId: text('vacancy_id').notNull(),
});

export const apiExecutions = pgTable('api_executions', {
  id: serial('id').primaryKey(),
  endpoint: text('endpoint').notNull(),
  executedAt: timestamp('executed_at').notNull().defaultNow(),
  status: text('status').notNull(),
  details: text('details'),
});