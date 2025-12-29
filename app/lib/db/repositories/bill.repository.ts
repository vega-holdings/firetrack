/**
 * Bill Repository
 * Handles all database operations for bills (unified model for both state and federal)
 */

import { prisma } from "../client";
import type { BaseRepository } from "./base";
import { createPaginatedResult, normalizePagination } from "./base";
import type {
  Bill,
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
} from "../types";

// Full bill creation input with relations
export interface CreateBillWithRelationsInput extends CreateBillInput {
  sponsors?: CreateSponsorInput[];
  actions?: CreateActionInput[];
  committees?: CreateCommitteeInput[];
}

/**
 * Bill Repository Implementation
 * Handles both federal and state bills in a unified manner
 */
export class BillRepository
  implements BaseRepository<Bill, CreateBillInput, UpdateBillInput>
{
  /**
   * Find a bill by ID
   */
  async findById(id: string): Promise<Bill | null> {
    return prisma.bill.findUnique({
      where: { id },
    });
  }

  /**
   * Find a bill by ID with all relations
   */
  async findByIdWithRelations(id: string): Promise<BillWithRelations | null> {
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        sponsors: {
          orderBy: { isPrimary: "desc" },
        },
        actions: {
          orderBy: { actionOrder: "desc" },
        },
        committees: true,
        documents: true,
        versions: {
          orderBy: { date: "desc" },
        },
        votes: {
          include: {
            counts: true,
          },
        },
        statusHistory: {
          orderBy: { timestamp: "desc" },
        },
        comments: {
          where: { isPublic: true },
          orderBy: { createdAt: "desc" },
        },
        annotations: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!bill) return null;

    // Transform to BillWithRelations type
    return {
      ...bill,
      sponsors: bill.sponsors.map((s) => ({
        id: s.id,
        name: s.name,
        isPrimary: s.isPrimary,
        sponsorType: s.sponsorType,
        party: s.party,
        state: s.state,
        district: s.district,
        title: s.title,
        bioguideId: s.bioguideId,
        openstatesPersonId: s.openstatesPersonId,
      })),
      actions: bill.actions.map((a) => ({
        id: a.id,
        description: a.description,
        date: a.date,
        actionOrder: a.actionOrder,
        actionType: a.actionType,
        actionCode: a.actionCode,
        classification: a.classification,
        chamber: a.chamber,
        organizationName: a.organizationName,
        sourceSystem: a.sourceSystem,
      })),
      committees: bill.committees.map((c) => ({
        id: c.id,
        name: c.name,
        chamber: c.chamber,
        type: c.type,
        activity: c.activity,
      })),
      documents: bill.documents.map((d) => ({
        id: d.id,
        note: d.note,
        date: d.date,
        links: d.links,
      })),
      versions: bill.versions.map((v) => ({
        id: v.id,
        note: v.note,
        date: v.date,
        links: v.links,
      })),
      votes: bill.votes.map((v) => ({
        id: v.id,
        identifier: v.identifier,
        motionText: v.motionText,
        startDate: v.startDate,
        result: v.result,
        chamber: v.chamber,
        counts: v.counts.map((c) => ({
          option: c.option,
          value: c.value,
        })),
      })),
      statusHistory: bill.statusHistory.map((h) => ({
        id: h.id,
        status: h.status,
        timestamp: h.timestamp,
        note: h.note,
      })),
      comments: bill.comments.map((c) => ({
        id: c.id,
        text: c.text,
        isPublic: c.isPublic,
        createdAt: c.createdAt,
        userId: c.userId,
      })),
      annotations: bill.annotations.map((a) => ({
        id: a.id,
        text: a.text,
        type: a.type,
        createdAt: a.createdAt,
        userId: a.userId,
      })),
    } as BillWithRelations;
  }

  /**
   * Find multiple bills with pagination
   */
  async findMany(params?: PaginationParams): Promise<PaginatedResult<Bill>> {
    const { page, limit, skip } = normalizePagination(params);

    const [data, total] = await Promise.all([
      prisma.bill.findMany({
        skip,
        take: limit,
        orderBy: { latestActionDate: "desc" },
      }),
      prisma.bill.count(),
    ]);

    return createPaginatedResult(data, total, page, limit);
  }

  /**
   * Search bills with filters (unified for both federal and state)
   */
  async search(
    filters: BillFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<UnifiedBill>> {
    const { page, limit, skip } = normalizePagination(pagination);

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Jurisdiction filter
    if (filters.jurisdiction && filters.jurisdiction !== "all") {
      where.jurisdiction = filters.jurisdiction;
    }

    // State filter (for state bills)
    if (filters.state) {
      where.state = filters.state;
    }

    // Status filter
    if (filters.status) {
      where.status = { contains: filters.status };
    }

    // Bill type filter
    if (filters.billType) {
      where.billType = filters.billType;
    }

    // Session filter
    if (filters.session) {
      where.session = filters.session;
    }

    // Search filter (title, identifier)
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { shortTitle: { contains: filters.search } },
        { identifier: { contains: filters.search } },
      ];
    }

    // Date range filters
    if (filters.fromDate || filters.toDate) {
      where.latestActionDate = {};
      if (filters.fromDate) {
        where.latestActionDate.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.latestActionDate.lte = filters.toDate;
      }
    }

    // Fetch bills with sponsors
    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          sponsors: {
            where: { isPrimary: true },
            take: 3,
          },
        },
        orderBy: { latestActionDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where }),
    ]);

    // Transform to unified format
    const unifiedBills: UnifiedBill[] = bills.map((bill) =>
      this.toUnifiedBill(bill)
    );

    return createPaginatedResult(unifiedBills, total, page, limit);
  }

  /**
   * Create a new bill
   */
  async create(data: CreateBillInput): Promise<Bill> {
    return prisma.bill.create({
      data,
    });
  }

  /**
   * Create a bill with relations (sponsors, actions, committees)
   */
  async createWithRelations(data: CreateBillWithRelationsInput): Promise<Bill> {
    const { sponsors, actions, committees, ...billData } = data;

    return prisma.bill.create({
      data: {
        ...billData,
        sponsors: sponsors
          ? {
              create: sponsors,
            }
          : undefined,
        actions: actions
          ? {
              create: actions.map((a, index) => ({
                ...a,
                actionOrder: a.actionOrder ?? index,
              })),
            }
          : undefined,
        committees: committees
          ? {
              create: committees,
            }
          : undefined,
      },
      include: {
        sponsors: true,
        actions: true,
        committees: true,
      },
    });
  }

  /**
   * Update a bill
   */
  async update(id: string, data: UpdateBillInput): Promise<Bill> {
    return prisma.bill.update({
      where: { id },
      data,
    });
  }

  /**
   * Upsert a bill (create or update)
   */
  async upsert(data: CreateBillInput): Promise<Bill> {
    return prisma.bill.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  /**
   * Upsert a bill with relations
   */
  async upsertWithRelations(data: CreateBillWithRelationsInput): Promise<Bill> {
    const { sponsors, actions, committees, ...billData } = data;

    // Use transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
      // Upsert the bill
      const bill = await tx.bill.upsert({
        where: { id: billData.id },
        create: billData,
        update: billData,
      });

      // Delete existing relations and recreate
      if (sponsors) {
        await tx.billSponsor.deleteMany({ where: { billId: bill.id } });
        await tx.billSponsor.createMany({
          data: sponsors.map((s) => ({ ...s, billId: bill.id })),
        });
      }

      if (actions) {
        await tx.billAction.deleteMany({ where: { billId: bill.id } });
        await tx.billAction.createMany({
          data: actions.map((a, index) => ({
            ...a,
            billId: bill.id,
            actionOrder: a.actionOrder ?? index,
          })),
        });
      }

      if (committees) {
        await tx.billCommittee.deleteMany({ where: { billId: bill.id } });
        await tx.billCommittee.createMany({
          data: committees.map((c) => ({ ...c, billId: bill.id })),
        });
      }

      return bill;
    });
  }

  /**
   * Delete a bill
   */
  async delete(id: string): Promise<void> {
    await prisma.bill.delete({
      where: { id },
    });
  }

  /**
   * Check if a bill exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await prisma.bill.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Count bills with optional filters
   */
  async count(filters?: Record<string, unknown>): Promise<number> {
    return prisma.bill.count({
      where: filters,
    });
  }

  /**
   * Get bill counts by jurisdiction
   */
  async getCounts(): Promise<{
    total: number;
    federal: number;
    state: number;
    byState: Record<string, number>;
  }> {
    const [total, federal, state, stateGroups] = await Promise.all([
      prisma.bill.count(),
      prisma.bill.count({ where: { jurisdiction: "federal" } }),
      prisma.bill.count({ where: { jurisdiction: "state" } }),
      prisma.bill.groupBy({
        by: ["state"],
        where: { jurisdiction: "state", state: { not: null } },
        _count: true,
      }),
    ]);

    const byState: Record<string, number> = {};
    for (const group of stateGroups) {
      if (group.state) {
        byState[group.state] = group._count;
      }
    }

    return { total, federal, state, byState };
  }

  /**
   * Find bills by jurisdiction
   */
  async findByJurisdiction(
    jurisdiction: "federal" | "state",
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Bill>> {
    const { page, limit, skip } = normalizePagination(pagination);

    const [data, total] = await Promise.all([
      prisma.bill.findMany({
        where: { jurisdiction },
        skip,
        take: limit,
        orderBy: { latestActionDate: "desc" },
      }),
      prisma.bill.count({ where: { jurisdiction } }),
    ]);

    return createPaginatedResult(data, total, page, limit);
  }

  /**
   * Find federal bill by congress and number
   */
  async findByCongressAndNumber(
    congress: number,
    billType: string,
    number: string
  ): Promise<Bill | null> {
    return prisma.bill.findFirst({
      where: {
        jurisdiction: "federal",
        congress,
        billType,
        identifier: { contains: number },
      },
    });
  }

  /**
   * Find state bill by OpenStates ID
   */
  async findByOpenstatesId(openstatesId: string): Promise<Bill | null> {
    return prisma.bill.findFirst({
      where: { openstatesId },
    });
  }

  /**
   * Convert Bill to UnifiedBill format
   */
  private toUnifiedBill(
    bill: Bill & {
      sponsors?: Array<{
        name: string;
        isPrimary: boolean;
        party: string | null;
      }>;
    }
  ): UnifiedBill {
    return {
      id: bill.id,
      identifier: bill.identifier,
      title: bill.title,
      shortTitle: bill.shortTitle,
      jurisdiction: bill.jurisdiction as "federal" | "state",
      state: bill.state,
      status: bill.status,
      latestActionDate: bill.latestActionDate,
      latestActionText: bill.latestActionText,
      introducedDate: bill.introducedDate,
      url: bill.externalUrl,
      billType: bill.billType,
      session: bill.session,
      sponsors: bill.sponsors?.map((s) => ({
        name: s.name,
        isPrimary: s.isPrimary,
        party: s.party,
      })),
    };
  }
}

// Singleton instance
export const billRepository = new BillRepository();
