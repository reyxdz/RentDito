import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as securityService from '../services/security.service';

// Incidents
export const getIncidentReports = catchAsync(async (req: AuthRequest, res: Response) => {
    const filters = req.query;
    const incidents = await securityService.getIncidentReports(filters);
    res.status(200).json({ status: 'success', data: incidents });
});

export const getIncidentReport = catchAsync(async (req: AuthRequest, res: Response) => {
    const incident = await securityService.getIncidentReportById(req.params.id as string);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found' });
    }
    res.status(200).json({ status: 'success', data: incident });
});

export const createIncidentReport = catchAsync(async (req: AuthRequest, res: Response) => {
    const incidentData = { ...req.body, reportedBy: req.user!.id };
    const newIncident = await securityService.createIncidentReport(incidentData);
    res.status(201).json({ status: 'success', data: newIncident });
});

export const updateIncidentReport = catchAsync(async (req: AuthRequest, res: Response) => {
    const incident = await securityService.updateIncidentReport(req.params.id as string, req.body);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found' });
    }
    res.status(200).json({ status: 'success', data: incident });
});

export const deleteIncidentReport = catchAsync(async (req: AuthRequest, res: Response) => {
    const incident = await securityService.deleteIncidentReport(req.params.id as string);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found' });
    }
    res.status(200).json({ status: 'success', message: 'Incident deleted successfully' });
});

// Emergency Contacts
export const getEmergencyContacts = catchAsync(async (req: AuthRequest, res: Response) => {
    const contacts = await securityService.getEmergencyContacts(req.params.propertyId as string);
    res.status(200).json({ status: 'success', data: contacts });
});

export const updateEmergencyContacts = catchAsync(async (req: AuthRequest, res: Response) => {
    const contacts = await securityService.updateEmergencyContacts(req.params.propertyId as string, req.body.contacts);
    res.status(200).json({ status: 'success', data: contacts });
});
