import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as securityService from '../services/security.service';

// Incidents
export const getIncidentReports = async (req: AuthRequest, res: Response) => {
  try {
    const filters = req.query;
    const incidents = await securityService.getIncidentReports(filters);
    res.status(200).json({ status: 'success', data: incidents });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getIncidentReport = async (req: AuthRequest, res: Response) => {
  try {
    const incident = await securityService.getIncidentReportById(req.params.id as string);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found' });
    }
    res.status(200).json({ status: 'success', data: incident });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createIncidentReport = async (req: AuthRequest, res: Response) => {
  try {
    const incidentData = { ...req.body, reportedBy: req.user!.id };
    const newIncident = await securityService.createIncidentReport(incidentData);
    res.status(201).json({ status: 'success', data: newIncident });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const updateIncidentReport = async (req: AuthRequest, res: Response) => {
  try {
    const incident = await securityService.updateIncidentReport(req.params.id as string, req.body);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found' });
    }
    res.status(200).json({ status: 'success', data: incident });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const deleteIncidentReport = async (req: AuthRequest, res: Response) => {
  try {
    const incident = await securityService.deleteIncidentReport(req.params.id as string);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found' });
    }
    res.status(200).json({ status: 'success', message: 'Incident deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Emergency Contacts
export const getEmergencyContacts = async (req: AuthRequest, res: Response) => {
  try {
    const contacts = await securityService.getEmergencyContacts(req.params.propertyId as string);
    res.status(200).json({ status: 'success', data: contacts });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

export const updateEmergencyContacts = async (req: AuthRequest, res: Response) => {
  try {
    const contacts = await securityService.updateEmergencyContacts(req.params.propertyId as string, req.body.contacts);
    res.status(200).json({ status: 'success', data: contacts });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};
