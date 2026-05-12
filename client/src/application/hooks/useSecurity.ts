import { useState, useCallback } from 'react';
import { securityService } from '../../infrastructure/services/SecurityService';
import type { IncidentReport, EmergencyContact } from '../../domain/entities/IncidentReport';
import type { IncidentQueryFilters } from '../../domain/repositories/SecurityRepository';

export function useSecurity() {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async (filters?: IncidentQueryFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityService.getIncidentReports(filters);
      setIncidents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  }, []);

  const createIncident = async (data: Partial<IncidentReport>) => {
    setLoading(true);
    setError(null);
    try {
      const newIncident = await securityService.createIncidentReport(data);
      setIncidents(prev => [newIncident, ...prev]);
      return newIncident;
    } catch (err: any) {
      setError(err.message || 'Failed to create incident report');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateIncident = async (id: string, updates: Partial<IncidentReport>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedIncident = await securityService.updateIncidentReport(id, updates);
      setIncidents(prev => prev.map(inc => inc.id === id ? updatedIncident : inc));
      return updatedIncident;
    } catch (err: any) {
      setError(err.message || 'Failed to update incident');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = useCallback(async (propertyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityService.getEmergencyContacts(propertyId);
      setContacts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch emergency contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateContacts = async (propertyId: string, updatedContacts: EmergencyContact[]) => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityService.updateEmergencyContacts(propertyId, updatedContacts);
      setContacts(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to update emergency contacts');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    incidents, 
    contacts, 
    loading, 
    error, 
    fetchIncidents, 
    createIncident, 
    updateIncident,
    fetchContacts,
    updateContacts
  };
}
