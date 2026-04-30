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
      type: 'bedspace',
      bedsTotal: 4,
      bedsAvailable: 0,
      monthlyRent: 3500,
      status: 'occupied',
      features: [],
      images: []
    },
    toUnitId: 'unit_new',
    toUnit: {
      id: 'unit_new',
      propertyId: 'prop_1',
      unitIdentifier: '102-B',
      type: 'private',
      bedsTotal: 1,
      bedsAvailable: 1,
      monthlyRent: 8000,
      status: 'available',
      features: [],
      images: []
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
      type: 'private',
      bedsTotal: 1,
      bedsAvailable: 0,
      monthlyRent: 7500,
      status: 'occupied',
      features: [],
      images: []
    },
    toUnitId: 'unit_b',
    toUnit: {
      id: 'unit_b',
      propertyId: 'prop_2',
      unitIdentifier: '301',
      type: 'private',
      bedsTotal: 1,
      bedsAvailable: 1,
      monthlyRent: 7000,
      status: 'available',
      features: [],
      images: []
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

  return { transfers, loading, fetchTransfers };
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
