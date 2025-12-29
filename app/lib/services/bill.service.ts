/**
 * Bill Service
 * Business logic for bill operations
 */

import {
  billRepository,
  type BillFilters,
  type PaginationParams,
  type PaginatedResult,
  type UnifiedBill,
  type BillWithRelations,
} from "../db";

/**
 * Action result type for service methods
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Bill Service
 * Handles all bill-related business logic
 * Works with the unified Bill model (both federal and state)
 */
export class BillService {
  /**
   * Search bills with filters
   * Unified search across both state and federal bills
   */
  async searchBills(
    filters: BillFilters,
    pagination?: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<UnifiedBill>>> {
    try {
      const result = await billRepository.search(filters, pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error("[BillService] Search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to search bills",
      };
    }
  }

  /**
   * Get a single bill by ID
   */
  async getBillById(
    id: string
  ): Promise<ServiceResult<BillWithRelations | null>> {
    try {
      const bill = await billRepository.findByIdWithRelations(id);
      return { success: true, data: bill };
    } catch (error) {
      console.error("[BillService] GetById error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get bill",
      };
    }
  }

  /**
   * Get bill counts for dashboard
   */
  async getBillCounts(): Promise<
    ServiceResult<{
      total: number;
      federal: number;
      state: number;
      byState: Record<string, number>;
    }>
  > {
    try {
      const counts = await billRepository.getCounts();
      return { success: true, data: counts };
    } catch (error) {
      console.error("[BillService] GetCounts error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get bill counts",
      };
    }
  }

  /**
   * Get recent bills
   */
  async getRecentBills(
    limit: number = 10
  ): Promise<ServiceResult<UnifiedBill[]>> {
    try {
      const result = await billRepository.search({}, { page: 1, limit });
      return { success: true, data: result.data };
    } catch (error) {
      console.error("[BillService] GetRecent error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get recent bills",
      };
    }
  }

  /**
   * Get bills by jurisdiction
   */
  async getBillsByJurisdiction(
    jurisdiction: "federal" | "state",
    pagination?: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<UnifiedBill>>> {
    try {
      const result = await billRepository.search({ jurisdiction }, pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error("[BillService] GetByJurisdiction error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get bills",
      };
    }
  }

  /**
   * Get bills by state
   */
  async getBillsByState(
    state: string,
    pagination?: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<UnifiedBill>>> {
    try {
      const result = await billRepository.search(
        { jurisdiction: "state", state },
        pagination
      );
      return { success: true, data: result };
    } catch (error) {
      console.error("[BillService] GetByState error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get bills",
      };
    }
  }

  /**
   * Check if a bill exists
   */
  async billExists(id: string): Promise<boolean> {
    try {
      return await billRepository.exists(id);
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const billService = new BillService();
