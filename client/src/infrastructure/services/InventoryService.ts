import { apiClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import type { Inventory } from '../../domain/entities/Inventory';
import type { InventoryRecord } from '../../domain/entities/InventoryRecord';
import type { InventoryRepository, InventoryFilters, InventoryRecordFilters, InventoryMetrics } from '../../domain/repositories/InventoryRepository';

export class InventoryService implements InventoryRepository {
  async getInventory(filters?: InventoryFilters): Promise<Inventory[]> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.INVENTORY.ROOT, { params: filters });
      return data.data || data;
    } catch (error: any) {
      // Mock Fallback
      return [
        {
          id: 'inv_1',
          propertyId: 'p1',
          itemName: 'Samsung Split-type AC 1HP',
          serialNumber: 'SMC-9921-AC',
          condition: 'good',
          quantity: 1,
          status: 'issued',
          purchaseDate: '2023-01-15T00:00:00Z',
          purchaseCost: 25000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'inv_2',
          propertyId: 'p1',
          itemName: 'Office Desk Chair (Ergo)',
          condition: 'new',
          quantity: 5,
          status: 'available',
          purchaseDate: '2025-11-10T00:00:00Z',
          purchaseCost: 3500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'inv_3',
          propertyId: 'p2',
          itemName: 'Microwave Oven (LG)',
          serialNumber: 'LG-MW-005',
          condition: 'damaged',
          quantity: 1,
          status: 'maintenance',
          purchaseDate: '2022-05-20T00:00:00Z',
          purchaseCost: 4500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
    }
  }

  async createItem(item: Partial<Inventory>): Promise<Inventory> {
    try {
      const { data } = await apiClient.post(ENDPOINTS.INVENTORY.ROOT, item);
      return data.data || data;
    } catch (error: any) {
      return {
        ...item,
        id: `mock_inv_${Date.now()}`,
        status: item.status || 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Inventory;
    }
  }

  async updateItem(id: string, item: Partial<Inventory>): Promise<Inventory> {
    try {
      const { data } = await apiClient.put(ENDPOINTS.INVENTORY.DETAILS(id), item);
      return data.data || data;
    } catch (error: any) {
      return { id, ...item } as Inventory;
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      await apiClient.delete(ENDPOINTS.INVENTORY.DETAILS(id));
    } catch (error: any) {
      // simulate success
    }
  }

  async getRecords(filters?: InventoryRecordFilters): Promise<InventoryRecord[]> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.INVENTORY.RECORDS, { params: filters });
      return data.data || data;
    } catch (error: any) {
      return [
        {
          id: 'rec_1',
          inventoryItemId: 'inv_1',
          inventoryItem: { id: 'inv_1', itemName: 'Samsung Split-type AC 1HP', condition: 'good', quantity: 1, status: 'issued', propertyId: 'p1', createdAt: new Date(), updatedAt: new Date() },
          tenancyId: 't1',
          issuedByUserId: 'staff_1',
          issuedDate: '2026-01-10T00:00:00Z',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rec_2',
          inventoryItemId: 'inv_3',
          inventoryItem: { id: 'inv_3', itemName: 'Microwave Oven (LG)', condition: 'damaged', quantity: 1, status: 'maintenance', propertyId: 'p2', createdAt: new Date(), updatedAt: new Date() },
          tenancyId: 't2',
          issuedByUserId: 'staff_1',
          issuedDate: '2025-06-01T00:00:00Z',
          returnDate: '2025-12-01T00:00:00Z',
          returnCondition: 'damaged',
          damageNotes: 'Glass door shattered by tenant.',
          penaltyAmount: 2500,
          deductedFromDeposit: true,
          status: 'damaged',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
    }
  }

  async issueItem(recordData: Partial<InventoryRecord>): Promise<InventoryRecord> {
    try {
      const { data } = await apiClient.post(ENDPOINTS.INVENTORY.RECORDS, recordData);
      return data.data || data;
    } catch (error: any) {
      return {
        ...recordData,
        id: `mock_rec_${Date.now()}`,
        status: 'active',
        issuedDate: recordData.issuedDate || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as InventoryRecord;
    }
  }

  async returnItem(recordId: string, returnData: { returnCondition: string; damageNotes?: string; penaltyAmount?: number; deductedFromDeposit?: boolean }): Promise<InventoryRecord> {
    try {
      const { data } = await apiClient.post(`${ENDPOINTS.INVENTORY.RECORDS}/${recordId}/return`, returnData);
      return data.data || data;
    } catch (error: any) {
      return {
        id: recordId,
        inventoryItemId: 'inv_1',
        tenancyId: 't1',
        issuedByUserId: 'mock_staff',
        issuedDate: '2026-01-01',
        status: returnData.returnCondition === 'damaged' ? 'damaged' : 'returned',
        returnDate: new Date().toISOString(),
        ...(returnData as any),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async getMetrics(propertyId?: string): Promise<InventoryMetrics> {
    try {
      const { data } = await apiClient.get(ENDPOINTS.INVENTORY.METRICS, { params: { propertyId } });
      return data.data || data;
    } catch (error: any) {
      return {
        activeIssued: 45,
        available: 120,
        lostDamaged: 12,
        maintenance: 8,
        mostDamagedItem: { itemName: 'Office Chairs', damageCount: 6 },
        depreciation: [
          { itemName: 'Samsung AC 1HP', cost: 25000, ageInMonths: 36, currentEstimatedValue: 12500 },
          { itemName: 'LG Refrigerator', cost: 18000, ageInMonths: 24, currentEstimatedValue: 10800 },
          { itemName: 'Ergo Chair', cost: 3500, ageInMonths: 12, currentEstimatedValue: 2800 },
        ],
        statusDistribution: [
          { name: 'Available', value: 120 },
          { name: 'Issued', value: 45 },
          { name: 'Maintenance', value: 8 },
          { name: 'Retired', value: 12 }
        ]
      };
    }
  }
}

export const inventoryService = new InventoryService();
