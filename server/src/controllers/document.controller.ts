import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as documentService from '../services/document.service';

export const getDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const filters = req.query;
    const documents = await documentService.getDocuments(filters);
    res.status(200).json({ status: 'success', data: documents });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDocument = async (req: AuthRequest, res: Response) => {
  try {
    const document = await documentService.getDocumentById(req.params.id as string);
    if (!document) {
      return res.status(404).json({ status: 'error', message: 'Document not found' });
    }
    res.status(200).json({ status: 'success', data: document });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createDocument = async (req: AuthRequest, res: Response) => {
  try {
    const documentData = { ...req.body, uploadedBy: req.user!.id };
    const newDocument = await documentService.createDocument(documentData);
    res.status(201).json({ status: 'success', data: newDocument });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const document = await documentService.deleteDocument(req.params.id as string);
    if (!document) {
      return res.status(404).json({ status: 'error', message: 'Document not found' });
    }
    res.status(200).json({ status: 'success', message: 'Document deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
