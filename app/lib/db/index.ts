/**
 * Database Layer
 * All database access should go through this module
 */

// Client
export { prisma, db } from "./client";

// Repositories
export { BillRepository, billRepository } from "./repositories/bill.repository";
export type { CreateBillWithRelationsInput } from "./repositories/bill.repository";

// Base repository utilities
export {
  createPaginatedResult,
  normalizePagination,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from "./repositories/base";
export type { BaseRepository } from "./repositories/base";

// Types - Prisma models
export type {
  Bill,
  BillSponsor,
  BillAction,
  BillCommittee,
  BillDocument,
  BillVersion,
  BillSource,
  BillAbstract,
  BillOtherTitle,
  BillOtherIdentifier,
  BillRelated,
  BillStatusHistory,
  BillComment,
  BillAnnotation,
  VoteEvent,
  Vote,
  VoteCount,
  Legislator,
  User,
  TrackedBill,
  AlertSubscription,
  Alert,
  RSSFeed,
  RSSItem,
  RSSItemMatch,
  SyncLog,
} from "./types";

// Types - Custom interfaces
export type {
  PaginationParams,
  PaginatedResult,
  BillFilters,
  UnifiedBill,
  BillWithRelations,
  CreateBillInput,
  UpdateBillInput,
  CreateSponsorInput,
  CreateActionInput,
  CreateCommitteeInput,
  LegislatorFilters,
  AlertFilters,
  SyncLogInput,
} from "./types";
