/**
 * Database entity types
 * These types represent the domain entities for the unified schema
 */

// Re-export Prisma types that match the new unified schema
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
} from "@prisma/client";

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Filter types for bills
export interface BillFilters {
  jurisdiction?: "federal" | "state" | "all";
  state?: string;
  status?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  billType?: string;
  session?: string;
}

// Unified bill type for the UI
export interface UnifiedBill {
  id: string;
  identifier: string;
  title: string | null;
  shortTitle?: string | null;
  jurisdiction: "federal" | "state";
  state?: string | null;
  status?: string | null;
  latestActionDate: Date | null;
  latestActionText: string | null;
  introducedDate?: Date | null;
  url?: string | null;
  billType?: string | null;
  session?: string | null;
  sponsors?: Array<{
    name: string;
    isPrimary: boolean;
    party?: string | null;
  }>;
}

// Bill with all relations (for detail pages)
export interface BillWithRelations {
  id: string;
  identifier: string;
  title: string | null;
  shortTitle: string | null;
  summary: string | null;
  jurisdiction: string;
  state: string | null;
  session: string | null;
  congress: number | null;
  billType: string | null;
  classification: string | null;
  subjects: string | null;
  policyArea: string | null;
  originChamber: string | null;
  organizationId: string | null;
  organizationName: string | null;
  status: string | null;
  latestActionDate: Date | null;
  latestActionText: string | null;
  introducedDate: Date | null;
  firstActionDate: Date | null;
  latestPassageDate: Date | null;
  externalUrl: string | null;
  openstatesId: string | null;
  congressGovId: string | null;
  extras: string | null;
  createdAt: Date;
  updatedAt: Date;
  sponsors: Array<{
    id: string;
    name: string;
    isPrimary: boolean;
    sponsorType: string | null;
    party: string | null;
    state: string | null;
    district: string | null;
    title: string | null;
    bioguideId: string | null;
    openstatesPersonId: string | null;
  }>;
  actions: Array<{
    id: string;
    description: string;
    date: Date;
    actionOrder: number;
    actionType: string | null;
    actionCode: string | null;
    classification: string | null;
    chamber: string | null;
    organizationName: string | null;
    sourceSystem: string | null;
  }>;
  committees: Array<{
    id: string;
    name: string;
    chamber: string | null;
    type: string | null;
    activity: string | null;
  }>;
  documents: Array<{
    id: string;
    note: string | null;
    date: Date | null;
    links: string | null;
  }>;
  versions: Array<{
    id: string;
    note: string | null;
    date: Date | null;
    links: string | null;
  }>;
  votes: Array<{
    id: string;
    identifier: string;
    motionText: string;
    startDate: Date;
    result: string;
    chamber: string | null;
    counts: Array<{
      option: string;
      value: number;
    }>;
  }>;
  statusHistory: Array<{
    id: string;
    status: string;
    timestamp: Date;
    note: string | null;
  }>;
  comments: Array<{
    id: string;
    text: string;
    isPublic: boolean;
    createdAt: Date;
    userId: string | null;
  }>;
  annotations: Array<{
    id: string;
    text: string;
    type: string | null;
    createdAt: Date;
    userId: string | null;
  }>;
}

// Input types for creating/updating bills
export interface CreateBillInput {
  id: string;
  identifier: string;
  title?: string | null;
  shortTitle?: string | null;
  summary?: string | null;
  jurisdiction: string;
  state?: string | null;
  session?: string | null;
  congress?: number | null;
  billType?: string | null;
  classification?: string | null;
  subjects?: string | null;
  policyArea?: string | null;
  originChamber?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  status?: string | null;
  latestActionDate?: Date | null;
  latestActionText?: string | null;
  introducedDate?: Date | null;
  firstActionDate?: Date | null;
  latestPassageDate?: Date | null;
  externalUrl?: string | null;
  openstatesId?: string | null;
  congressGovId?: string | null;
  extras?: string | null;
}

export interface UpdateBillInput extends Partial<Omit<CreateBillInput, "id">> {}

// Sponsor input types
export interface CreateSponsorInput {
  name: string;
  isPrimary?: boolean;
  sponsorType?: string | null;
  party?: string | null;
  state?: string | null;
  district?: string | null;
  title?: string | null;
  bioguideId?: string | null;
  openstatesPersonId?: string | null;
}

// Action input types
export interface CreateActionInput {
  description: string;
  date: Date;
  actionOrder?: number;
  actionType?: string | null;
  actionCode?: string | null;
  classification?: string | null;
  chamber?: string | null;
  organizationName?: string | null;
  sourceSystem?: string | null;
}

// Committee input types
export interface CreateCommitteeInput {
  name: string;
  chamber?: string | null;
  type?: string | null;
  activity?: string | null;
}

// Legislator types
export interface LegislatorFilters {
  state?: string;
  party?: string;
  chamber?: string;
  inOffice?: boolean;
  search?: string;
}

// Alert types
export interface AlertFilters {
  userId?: string;
  isRead?: boolean;
  alertType?: string;
}

// Sync log types
export interface SyncLogInput {
  source: string;
  sourceId?: string | null;
  status?: string;
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsFailed?: number;
  errorMessage?: string | null;
  details?: string | null;
}
