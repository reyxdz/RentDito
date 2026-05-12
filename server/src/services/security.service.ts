import { IncidentReport, IIncidentReport } from '../models/IncidentReport';
import { Property } from '../models/Property';
import mongoose from 'mongoose';

// Incident Reports

export const getIncidentReports = async (filters: any): Promise<IIncidentReport[]> => {
  const query: any = {};
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.status) query.status = filters.status;
  if (filters.severity) query.severity = filters.severity;
  if (filters.type) query.type = filters.type;

  return IncidentReport.find(query)
    .populate('reportedBy', 'name email')
    .populate('propertyId', 'name')
    .sort({ createdAt: -1 });
};

export const getIncidentReportById = async (id: string): Promise<IIncidentReport | null> => {
  return IncidentReport.findById(id)
    .populate('reportedBy', 'name email')
    .populate('propertyId', 'name');
};

export const createIncidentReport = async (data: Partial<IIncidentReport>): Promise<IIncidentReport> => {
  const incident = new IncidentReport(data);
  return incident.save();
};

export const updateIncidentReport = async (id: string, updates: Partial<IIncidentReport>): Promise<IIncidentReport | null> => {
  return IncidentReport.findByIdAndUpdate(id, updates, { new: true });
};

export const deleteIncidentReport = async (id: string): Promise<IIncidentReport | null> => {
  return IncidentReport.findByIdAndDelete(id);
};

// Emergency Contacts 

export const getEmergencyContacts = async (propertyId: string) => {
  const property = await Property.findById(propertyId).select('emergencyContacts');
  if (!property) throw new Error('Property not found');
  
  // Note: Assuming emergencyContacts is added to Property model, if not we will handle it in the model later or use a separate collection. 
  // Let's add it to the property model if needed, or we can just mock it here.
  return property.emergencyContacts || [];
};

export const updateEmergencyContacts = async (propertyId: string, contacts: any[]) => {
  const property = await Property.findByIdAndUpdate(
    propertyId, 
    { $set: { emergencyContacts: contacts } }, 
    { new: true }
  ).select('emergencyContacts');
  
  if (!property) throw new Error('Property not found');
  return property.emergencyContacts;
};
