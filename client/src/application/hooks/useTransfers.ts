import { useState, useCallback } from 'react';
import type { TransferRequest } from '../../domain/entities/TransferRequest';

const MOCK_TRANSFERS: TransferRequest[] = [
  {
    id: 'trf_1',
    tenancyId: 'tenancy_123',
    tenancy: {
      id: 'tenancy_123',
      userId: 'usr_tenant',
      propertyId: 'prop_1',
      unitId: 'unit_old',
      contractId: 'contract_1',
      status: 'checked_in',
      personalDetails: {
        fullName: 'Juan Dela Cruz',
        phone: '+639123456789',
        emergencyContact: 'Maria Dela Cruz',
        idDetails: 'Passport',
        address: 'Manila',
        occupation: 'Software Engineer',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    fromUnitId: 'unit_old',
    fromUnit: {
      id: 'unit_old',
      propertyId: 'prop_1',
      unitIdentifier: '101-A',
      accommodationType: 'bedspace',
      capacity: 4,
      maxOccupants: 4,
      deposit: 3500,
      bedspaceRent: 3500,
      status: 'occupied',
      features: [],
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    toUnitId: 'unit_new',
    toUnit: {
      id: 'unit_new',
      propertyId: 'prop_1',
      unitIdentifier: '102-B',
      accommodationType: 'room',
      capacity: 1,
      maxOccupants: 1,
      deposit: 8000,
      roomRent: 8000,
      status: 'vacant',
      features: [],
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    reason: 'Need more privacy for remote work.',
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'trf_2',
    tenancyId: 'tenancy_456',
    tenancy: {
      id: 'tenancy_456',
      userId: 'usr_tenant2',
      propertyId: 'prop_1',
      unitId: 'unit_a',
      contractId: 'contract_2',
      status: 'checked_in',
      personalDetails: {
        fullName: 'Maria Clara',
        phone: '+639987654321',
        emergencyContact: 'Crisostomo Ibarra',
        idDetails: 'Driver License',
        address: 'Quezon City',
        occupation: 'Teacher',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    fromUnitId: 'unit_a',
    fromUnit: {
      id: 'unit_a',
      propertyId: 'prop_1',
      unitIdentifier: '205',
      accommodationType: 'room',
      capacity: 1,
      maxOccupants: 1,
      deposit: 7500,
      roomRent: 7500,
      status: 'occupied',
      features: [],
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    toUnitId: 'unit_b',
    toUnit: {
      id: 'unit_b',
      propertyId: 'prop_2',
      unitIdentifier: '301',
      accommodationType: 'room',
      capacity: 1,
      maxOccupants: 1,
      deposit: 7000,
      roomRent: 7000,
      status: 'vacant',
      features: [],
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    reason: 'Transferring to a branch closer to workplace.',
    status: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  }
];

let transferDb = [...MOCK_TRANSFERS];

export function useTransfers() {
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    // Simulate network delay
    await new Promise(res => setTimeout(res, 500));
    setTransfers([...transferDb]);
    setLoading(false);
  }, []);

  const requestTransfer = useCallback(async (data: { fromUnitId: string; toUnitId: string; tenancyId: string; reason: string }) => {
    setLoading(true);
    await new Promise(res => setTimeout(res, 500));
    const newRequest: TransferRequest = {
      id: `trf_${Date.now()}`,
      tenancyId: data.tenancyId,
      fromUnitId: data.fromUnitId,
      toUnitId: data.toUnitId,
      reason: data.reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    transferDb = [newRequest, ...transferDb];
    setTransfers([...transferDb]);
    setLoading(false);
    return newRequest;
  }, []);

  return { transfers, loading, fetchTransfers, requestTransfer };
}

export function useTransferDetail(transferId?: string) {
  const [transfer, setTransfer] = useState<TransferRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTransfer = useCallback(async () => {
    if (!transferId) return;
    setLoading(true);
    await new Promise(res => setTimeout(res, 500));
    const found = transferDb.find(t => t.id === transferId) || null;
    setTransfer(found);
    setLoading(false);
  }, [transferId]);

  const approveTransfer = async () => {
    if (!transferId || !transfer) return;
    setLoading(true);
    await new Promise(res => setTimeout(res, 500));
    const updated = { ...transfer, status: 'approved' as const, updatedAt: new Date().toISOString() };
    transferDb = transferDb.map(t => t.id === transferId ? updated : t);
    setTransfer(updated);
    setLoading(false);
  };

  const rejectTransfer = async () => {
    if (!transferId || !transfer) return;
    setLoading(true);
    await new Promise(res => setTimeout(res, 500));
    const updated = { ...transfer, status: 'rejected' as const, updatedAt: new Date().toISOString() };
    transferDb = transferDb.map(t => t.id === transferId ? updated : t);
    setTransfer(updated);
    setLoading(false);
  };

  return { transfer, loading, fetchTransfer, approveTransfer, rejectTransfer };
}
