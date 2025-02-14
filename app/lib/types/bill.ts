import { z } from 'zod';
import type { Bill as PrismaBill } from '@prisma/client';

// Helper functions for JSON string fields
export const parseJsonField = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const stringifyJsonField = <T>(value: T | null): string | null => {
  if (!value) return null;
  return JSON.stringify(value);
};

// OpenStates API types
export type Organization = {
  id: string;
  name: string;
  classification: string;
};

export type CompactJurisdiction = {
  id: string;
  name: string;
  classification: string;
};

export type BillSponsorship = {
  id: string;
  name: string;
  entity_type: string;
  organization?: Organization;
  primary: boolean;
  classification: string;
};

export type BillDocumentLink = {
  url: string;
  media_type: string;
};

export type BillDocumentOrVersion = {
  id: string;
  note: string;
  date: string;
  links: BillDocumentLink[];
};

// Type for the legislative API response
export type LegislativeAPIBill = {
  id: string;
  session: string;
  jurisdiction: CompactJurisdiction;
  from_organization: Organization;
  identifier: string;
  title: string;
  classification?: string[];
  subject?: string[];
  extras?: Record<string, any>;
  created_at: string;
  updated_at: string;
  openstates_url?: string;
  first_action_date?: string;
  latest_action_date?: string;
  latest_action_description?: string;
  latest_passage_date?: string;
  sponsorships?: BillSponsorship[];
  actions?: {
    id: string;
    organization: Organization;
    description: string;
    date: string;
    classification: string[];
    order: number;
    related_entities?: any[];
  }[];
  sources?: { url: string; note?: string }[];
  versions?: BillDocumentOrVersion[];
  documents?: BillDocumentOrVersion[];
};

// Zod schemas for validation
export const billSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string().nullable(),
  session: z.string().nullable(),
  classification: z.string().optional().transform((val) => 
    val ? parseJsonField<string[]>(val) : null
  ),
  subject: z.string().optional().transform((val) => 
    val ? parseJsonField<string[]>(val) : null
  ),
  extras: z.string().optional().transform((val) => 
    val ? parseJsonField<Record<string, unknown>>(val) : null
  ),
  openstates_url: z.string().nullable(),
  first_action_date: z.date().nullable(),
  latest_action_date: z.date().nullable(),
  latest_action_description: z.string().nullable(),
  latest_passage_date: z.date().nullable(),
  jurisdiction_id: z.string().nullable(),
  jurisdiction_name: z.string().nullable(),
  jurisdiction_classification: z.string().nullable(),
  from_organization_id: z.string().nullable(),
  from_organization_name: z.string().nullable(),
  from_organization_classification: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export interface Sponsor {
  id: string;
  bill_id: string;
  name: string;
  primary: boolean | null;
}

export interface Document {
  id: string;
  bill_id: string;
  note: string | null;
  date: Date | null;
  links: BillDocumentLink[] | null;
}

export interface Version {
  id: string;
  bill_id: string;
  note: string | null;
  date: Date | null;
  links: BillDocumentLink[] | null;
}

export type Bill = z.infer<typeof billSchema> & {
  sponsors?: Sponsor[];
  documents?: Document[];
  versions?: Version[];
};

// Helper to convert API response to Prisma format
export const convertApiToPrisma = (bill: LegislativeAPIBill) => {
  const prismaData = {
    id: bill.id,
    identifier: bill.identifier,
    title: bill.title || null,
    session: bill.session || null,
    classification: bill.classification ? stringifyJsonField(bill.classification) : null,
    subject: bill.subject ? stringifyJsonField(bill.subject) : null,
    extras: bill.extras ? stringifyJsonField(bill.extras) : null,
    openstates_url: bill.openstates_url || null,
    first_action_date: bill.first_action_date ? new Date(bill.first_action_date) : null,
    latest_action_date: bill.latest_action_date ? new Date(bill.latest_action_date) : null,
    latest_action_description: bill.latest_action_description || null,
    latest_passage_date: bill.latest_passage_date ? new Date(bill.latest_passage_date) : null,
    jurisdiction_id: bill.jurisdiction?.id || null,
    jurisdiction_name: bill.jurisdiction?.name || null,
    jurisdiction_classification: bill.jurisdiction?.classification || null,
    from_organization_id: bill.from_organization?.id || null,
    from_organization_name: bill.from_organization?.name || null,
    from_organization_classification: bill.from_organization?.classification || null,
  };

  // Handle nested relations
  const documents = bill.documents?.map(doc => ({
    id: doc.id,
    bill_id: bill.id,
    note: doc.note || null,
    date: doc.date ? new Date(doc.date) : null,
    links: stringifyJsonField(doc.links),
  })) || [];

  const versions = bill.versions?.map(ver => ({
    id: ver.id,
    bill_id: bill.id,
    note: ver.note || null,
    date: ver.date ? new Date(ver.date) : null,
    links: stringifyJsonField(ver.links),
  })) || [];

  return {
    data: prismaData,
    documents,
    versions,
  };
};

// Search params schema
export const searchParamsSchema = z.object({
  query: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

// Action response types
export type BillActionResponse<T = unknown> = {
  success?: boolean;
  error?: string;
  data?: T;
};

export type SearchBillsResponse = BillActionResponse<{
  bills: Bill[];
  pagination?: {
    total: number;
    pages: number;
    current: number;
  };
}>;

export interface BillActionType {
  id: string;
  bill_id: string;
  description: string;
  date: Date;
  classification: string[] | null;
  order: number;
  organization_name: string | null;
}

export interface Vote {
  id: string;
  vote_event_id: string;
  option: string;
  voter_name: string;
  voter_id: string | null;
  voter_party: string | null;
}

export interface VoteEvent {
  id: string;
  bill_id: string;
  identifier: string;
  motion_text: string;
  start_date: Date;
  result: string;
  votes: Vote[];
  counts: {
    id: number;
    vote_event_id: string;
    option: string;
    value: number;
  }[];
}

export interface BillComment {
  id: number;
  bill_id: string;
  text: string;
  created_at: Date;
  updated_at: Date;
}

export interface BillAnnotation {
  id: number;
  bill_id: string;
  text: string;
  created_at: Date;
  updated_at: Date;
}

export type GetBillResponse = BillActionResponse<{
  bill: Bill & {
    sponsors?: Sponsor[];
    actions?: BillActionType[];
    votes?: VoteEvent[];
    documents?: Document[];
    versions?: Version[];
    comments?: BillComment[];
    annotations?: BillAnnotation[];
  };
}>;
