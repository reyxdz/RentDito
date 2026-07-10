import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync } from '../utils/catchAsync';
import * as documentService from '../services/document.service';

export const getDocuments = catchAsync(async (req: AuthRequest, res: Response) => {
    const filters = req.query;
    const documents = await documentService.getDocuments(filters);
    res.status(200).json({ status: 'success', data: documents });
});

export const getDocument = catchAsync(async (req: AuthRequest, res: Response) => {
    const document = await documentService.getDocumentById(req.params.id as string);
    if (!document) {
      return res.status(404).json({ status: 'error', message: 'Document not found' });
    }
    res.status(200).json({ status: 'success', data: document });
});

export const createDocument = catchAsync(async (req: AuthRequest, res: Response) => {
    const documentData = { ...req.body, uploadedBy: req.user!.id };
    const newDocument = await documentService.createDocument(documentData);
    res.status(201).json({ status: 'success', data: newDocument });
});

export const deleteDocument = catchAsync(async (req: AuthRequest, res: Response) => {
    const document = await documentService.deleteDocument(req.params.id as string);
    if (!document) {
      return res.status(404).json({ status: 'error', message: 'Document not found' });
    }
    res.status(200).json({ status: 'success', message: 'Document deleted successfully' });
});
