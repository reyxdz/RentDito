import { useState, useEffect, useCallback } from 'react';
import type { Property } from '../../domain/entities/Property';
import { propertyService } from '../../infrastructure/services/PropertyService';
import { useAuth } from '../context/AuthContext';

export function useProperties() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await propertyService.getPropertiesByLandlord(user.id);
      setProperties(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const createProperty = async (propertyParams: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'metrics'>) => {
    try {
      const newProperty = await propertyService.createProperty(propertyParams);
      setProperties(prev => [...prev, newProperty]);
      return newProperty;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create property');
    }
  };

  const updateProperty = async (propertyId: string, updates: Partial<Property>) => {
    try {
      const updatedProperty = await propertyService.updateProperty(propertyId, updates);
      setProperties(prev => prev.map(p => p.id === propertyId ? updatedProperty : p));
      return updatedProperty;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update property');
    }
  };

  const deleteProperty = async (propertyId: string) => {
    try {
      await propertyService.deleteProperty(propertyId);
      setProperties(prev => prev.filter(p => p.id !== propertyId));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete property');
    }
  };

  return { 
    properties, 
    loading, 
    error, 
    refresh: fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty
  };
}
