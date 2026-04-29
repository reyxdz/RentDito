import { useState, useCallback } from 'react';
import type { Inventory } from '../../domain/entities/Inventory';
import type { InventoryRecord } from '../../domain/entities/InventoryRecord';
import type { InventoryFilters, InventoryRecordFilters, InventoryMetrics } from '../../domain/repositories/InventoryRepository';
import { inventoryService } from '../../infrastructure/services/InventoryService';

export function useInventory() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async (filters?: InventoryFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getInventory(filters);
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory items');
    } finally {
      setLoading(false);
    }
  }, []);

  const createItem = async (data: Partial<Inventory>) => {
    try {
      const newItem = await inventoryService.createItem(data);
      setItems(prev => [newItem, ...prev]);
      return newItem;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create inventory item');
    }
  };

  const updateItem = async (id: string, data: Partial<Inventory>) => {
    try {
      const updatedItem = await inventoryService.updateItem(id, data);
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
      return updatedItem;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update inventory item');
    }
  };

  const fetchRecords = useCallback(async (filters?: InventoryRecordFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getRecords(filters);
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory records');
    } finally {
      setLoading(false);
    }
  }, []);

  const issueItem = async (data: Partial<InventoryRecord>) => {
    try {
      const newRecord = await inventoryService.issueItem(data);
      setRecords(prev => [newRecord, ...prev]);
      // Optimistically update the item status to 'issued'
      if (data.inventoryItemId) {
        setItems(prev => prev.map(item => item.id === data.inventoryItemId ? { ...item, status: 'issued' } : item));
      }
      return newRecord;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to issue inventory item');
    }
  };

  const returnItem = async (recordId: string, data: { returnCondition: string; damageNotes?: string; penaltyAmount?: number; deductedFromDeposit?: boolean }, inventoryItemId?: string) => {
    try {
      const updatedRecord = await inventoryService.returnItem(recordId, data);
      setRecords(prev => prev.map(rec => rec.id === recordId ? updatedRecord : rec));
      // Optimistically update the item status back
      if (inventoryItemId) {
        setItems(prev => prev.map(item => item.id === inventoryItemId ? { ...item, status: data.returnCondition === 'damaged' ? 'maintenance' : 'available', condition: data.returnCondition as any } : item));
      }
      return updatedRecord;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to return inventory item');
    }
  };

  const fetchMetrics = useCallback(async (propertyId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getMetrics(propertyId);
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    items,
    records,
    metrics,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    fetchRecords,
    issueItem,
    returnItem,
    fetchMetrics
  };
}
