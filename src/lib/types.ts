import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { visitedVacancies, apiExecutions } from './schema';

// Generated types from Drizzle schema
export type VisitedVacancy = InferSelectModel<typeof visitedVacancies>;
export type NewVisitedVacancy = InferInsertModel<typeof visitedVacancies>;

export type ApiExecution = InferSelectModel<typeof apiExecutions>;
export type NewApiExecution = InferInsertModel<typeof apiExecutions>;