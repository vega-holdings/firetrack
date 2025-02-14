export interface BillSponsorship {
  id: string;
  name: string;
  primary?: boolean;
  classification?: string;
  party?: string;
  title?: string;
}

export interface BillDocumentLink {
  url: string;
  media_type?: string;
}

export interface BillDocumentOrVersion {
  id: string;
  note?: string;
  date?: string;
  links?: BillDocumentLink[];
}

export interface Organization {
  id?: string;
  name?: string;
  classification?: string;
}

export interface LegislativeAPIBill {
  id: string;
  identifier: string;
  title?: string;
  session?: string;
  classification?: string[];
  subject?: string[];
  extras?: Record<string, any>;
  openstates_url?: string;
  first_action_date?: string;
  latest_action_date?: string;
  latest_action_description?: string;
  latest_passage_date?: string;
  jurisdiction?: Organization;
  from_organization?: Organization;
  sponsorships?: BillSponsorship[];
  documents?: BillDocumentOrVersion[];
  versions?: BillDocumentOrVersion[];
  sources?: { url: string; note?: string }[];
  abstracts?: { abstract: string; note?: string }[];
  other_titles?: { title: string; note?: string }[];
  other_identifiers?: { identifier: string; scheme?: string }[];
  actions?: {
    id: string;
    organization: Organization;
    description: string;
    date: string;
    classification: string[];
    order: number;
  }[];
  votes?: {
    id: string;
    organization?: Organization;
    motion_text?: string;
    start_date?: string;
    result?: string;
    counts: { option: string; value: number }[];
    votes: { option: string; voter_name: string; voter_id?: string; voter_party?: string }[];
  }[];
}

export interface SearchBillsResponse {
  success?: boolean;
  error?: string;
  data?: {
    bills: any[];
    pagination: {
      total: number;
      pages: number;
      current: number;
    };
  };
}

export interface GetBillResponse {
  success?: boolean;
  error?: string;
  data?: {
    bill: any;
  };
}

export const searchParamsSchema = {
  parse: (data: any) => ({
    query: data.query,
    state: data.state,
    status: data.status,
    jurisdiction: data.jurisdiction || "all", // "federal", "state", or "all"
    page: Number(data.page) || 1,
    limit: Number(data.limit) || 10,
  }),
};

export type JurisdictionType = "federal" | "state" | "all";

export function convertApiToPrisma(apiBill: LegislativeAPIBill) {
  return {
    id: apiBill.id,
    identifier: apiBill.identifier,
    title: apiBill.title || null,
    session: apiBill.session || null,
    classification: apiBill.classification ? JSON.stringify(apiBill.classification) : null,
    subject: apiBill.subject ? JSON.stringify(apiBill.subject) : null,
    extras: apiBill.extras ? JSON.stringify(apiBill.extras) : null,
    openstates_url: apiBill.openstates_url || null,
    first_action_date: apiBill.first_action_date ? new Date(apiBill.first_action_date) : null,
    latest_action_date: apiBill.latest_action_date ? new Date(apiBill.latest_action_date) : null,
    latest_action_description: apiBill.latest_action_description || null,
    latest_passage_date: apiBill.latest_passage_date ? new Date(apiBill.latest_passage_date) : null,
    jurisdiction_id: apiBill.jurisdiction?.id || null,
    jurisdiction_name: apiBill.jurisdiction?.name || null,
    jurisdiction_classification: apiBill.jurisdiction?.classification || null,
    from_organization_id: apiBill.from_organization?.id || null,
    from_organization_name: apiBill.from_organization?.name || null,
    from_organization_classification: apiBill.from_organization?.classification || null,
  };
}

export function parseJsonField<T>(field: string | null): T | null {
  if (!field) return null;
  try {
    return JSON.parse(field) as T;
  } catch {
    return null;
  }
}
