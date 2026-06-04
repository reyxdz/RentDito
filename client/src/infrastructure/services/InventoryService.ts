import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Inventory } from '../../domain/entities/Inventory';
import type { InventoryRecord } from '../../domain/entities/InventoryRecord';
import type { InventoryRepository, InventoryFilters, InventoryRecordFilters, InventoryMetrics } from '../../domain/repositories/InventoryRepository';

export class InventoryService implements InventoryRepository {
  async getInventory(filters?: InventoryFilters): Promise<Inventory[]> {
    const { data } = await apiClient.get(ENDPOINTS.INVENTORY.ROOT, { params: filters });
    return data.data || data;
  }

  async createItem(item: Partial<Inventory>): Promise<Inventory> {
    const { data } = await apiClient.post(ENDPOINTS.INVENTORY.ROOT, item);
    return data.data || data;
  }

  async updateItem(id: string, item: Partial<Inventory>): Promise<Inventory> {
    const { data } = await apiClient.put(ENDPOINTS.INVENTORY.DETAILS(id), item);
    return data.data || data;
  }

  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.INVENTORY.DETAILS(id));
  }

  async getRecords(filters?: InventoryRecordFilters): Promise<InventoryRecord[]> {
    const { data } = await apiClient.get(ENDPOINTS.INVENTORY.RECORDS, { params: filters });
    return data.data || data;
  }

  async issueItem(recordData: Partial<InventoryRecord>): Promise<InventoryRecord> {
    const { data } = await apiClient.post(ENDPOINTS.INVENTORY.RECORDS, recordData);
    return data.data || data;
  }

  async returnItem(recordId: string, returnData: { returnCondition: string; damageNotes?: string; penaltyAmount?: number; deductedFromDeposit?: boolean }): Promise<InventoryRecord> {
    const { data } = await apiClient.post(`${ENDPOINTS.INVENTORY.RECORDS}/${recordId}/return`, returnData);
    return data.data || data;
  }

  async getMetrics(propertyId?: string): Promise<InventoryMetrics> {
    const { data } = await apiClient.get(ENDPOINTS.INVENTORY.METRICS, { params: { propertyId } });
    return data.data || data;
  }
}

export const inventoryService = new InventoryService();
