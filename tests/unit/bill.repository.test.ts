import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma client
const mockPrisma = {
  bill: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  billSponsor: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  billAction: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  billCommittee: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

describe("Bill Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("should find a bill by ID", async () => {
      const { billRepository } = await import("@/lib/db/repositories/bill.repository");

      const mockBill = {
        id: "federal-118-hr-1234",
        identifier: "HR1234",
        title: "Test Bill",
        jurisdiction: "federal",
        state: null,
        status: "Introduced",
        latestActionDate: new Date(),
        latestActionText: "Introduced in House",
        introducedDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bill.findUnique.mockResolvedValue(mockBill);

      const result = await billRepository.findById("federal-118-hr-1234");

      expect(result).toEqual(mockBill);
      expect(mockPrisma.bill.findUnique).toHaveBeenCalledWith({
        where: { id: "federal-118-hr-1234" },
      });
    });

    it("should return null for non-existent bill", async () => {
      const { billRepository } = await import("@/lib/db/repositories/bill.repository");

      mockPrisma.bill.findUnique.mockResolvedValue(null);

      const result = await billRepository.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("findByIdWithRelations", () => {
    it("should find a bill with all relations", async () => {
      const { billRepository } = await import("@/lib/db/repositories/bill.repository");

      const mockBill = {
        id: "federal-118-hr-1234",
        identifier: "HR1234",
        title: "Test Bill",
        jurisdiction: "federal",
        shortTitle: "Test",
        summary: "A test bill",
        state: null,
        session: "118",
        congress: 118,
        billType: "HR",
        classification: null,
        subjects: null,
        policyArea: null,
        originChamber: "House",
        organizationId: null,
        organizationName: "U.S. House of Representatives",
        status: "Introduced",
        latestActionDate: new Date(),
        latestActionText: "Introduced in House",
        introducedDate: new Date(),
        firstActionDate: new Date(),
        latestPassageDate: null,
        externalUrl: "https://congress.gov/bill/118/hr/1234",
        openstatesId: null,
        congressGovId: "118-HR-1234",
        extras: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sponsors: [
          {
            id: "sponsor-1",
            name: "Rep. John Doe",
            isPrimary: true,
            sponsorType: "Primary",
            party: "D",
            state: "CA",
            district: "12",
            title: "Representative",
            bioguideId: "D000001",
            openstatesPersonId: null,
          },
        ],
        actions: [
          {
            id: "action-1",
            description: "Introduced in House",
            date: new Date(),
            actionOrder: 0,
            actionType: "introduction",
            actionCode: null,
            classification: null,
            chamber: "House",
            organizationName: "House",
            sourceSystem: null,
          },
        ],
        committees: [],
        documents: [],
        versions: [],
        votes: [],
        statusHistory: [],
        comments: [],
        annotations: [],
      };

      mockPrisma.bill.findUnique.mockResolvedValue(mockBill);

      const result = await billRepository.findByIdWithRelations("federal-118-hr-1234");

      expect(result).not.toBeNull();
      expect(result?.sponsors).toHaveLength(1);
      expect(result?.actions).toHaveLength(1);
    });
  });

  describe("search", () => {
    it("should search bills with filters", async () => {
      const { billRepository } = await import("@/lib/db/repositories/bill.repository");

      const mockBills = [
        {
          id: "federal-118-hr-1234",
          identifier: "HR1234",
          title: "Firearms Safety Act",
          jurisdiction: "federal",
          state: null,
          shortTitle: null,
          status: "Introduced",
          latestActionDate: new Date(),
          latestActionText: "Introduced",
          introducedDate: new Date(),
          externalUrl: null,
          billType: "HR",
          session: "118",
          sponsors: [
            { name: "Rep. Doe", isPrimary: true, party: "D" },
          ],
        },
      ];

      mockPrisma.bill.findMany.mockResolvedValue(mockBills);
      mockPrisma.bill.count.mockResolvedValue(1);

      const result = await billRepository.search(
        { jurisdiction: "federal", search: "firearms" },
        { page: 1, limit: 10 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it("should filter by state for state bills", async () => {
      const { billRepository } = await import("@/lib/db/repositories/bill.repository");

      mockPrisma.bill.findMany.mockResolvedValue([]);
      mockPrisma.bill.count.mockResolvedValue(0);

      await billRepository.search(
        { jurisdiction: "state", state: "TX" },
        { page: 1, limit: 10 }
      );

      expect(mockPrisma.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            jurisdiction: "state",
            state: "TX",
          }),
        })
      );
    });
  });

  describe("getCounts", () => {
    it("should return bill counts by jurisdiction", async () => {
      const { billRepository } = await import("@/lib/db/repositories/bill.repository");

      mockPrisma.bill.count.mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // federal
        .mockResolvedValueOnce(70); // state

      mockPrisma.bill.groupBy.mockResolvedValue([
        { state: "TX", _count: 20 },
        { state: "CA", _count: 15 },
        { state: "NY", _count: 10 },
      ]);

      const result = await billRepository.getCounts();

      expect(result.total).toBe(100);
      expect(result.federal).toBe(30);
      expect(result.state).toBe(70);
      expect(result.byState.TX).toBe(20);
      expect(result.byState.CA).toBe(15);
    });
  });

  describe("upsertWithRelations", () => {
    it("should upsert a bill with sponsors and actions", async () => {
      const { billRepository } = await import("@/lib/db/repositories/bill.repository");

      const mockBill = {
        id: "federal-118-hr-1234",
        identifier: "HR1234",
        title: "Test Bill",
        jurisdiction: "federal",
      };

      mockPrisma.bill.upsert.mockResolvedValue(mockBill);
      mockPrisma.billSponsor.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.billSponsor.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.billAction.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.billAction.createMany.mockResolvedValue({ count: 1 });

      const result = await billRepository.upsertWithRelations({
        id: "federal-118-hr-1234",
        identifier: "HR1234",
        title: "Test Bill",
        jurisdiction: "federal",
        sponsors: [
          { name: "Rep. Doe", isPrimary: true },
        ],
        actions: [
          { description: "Introduced", date: new Date() },
        ],
      });

      expect(result).toEqual(mockBill);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
