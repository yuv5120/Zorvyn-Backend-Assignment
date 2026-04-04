import { Request, Response, NextFunction } from 'express';
import * as RecordsService from './records.service';
import {
  createRecordSchema,
  updateRecordSchema,
  listRecordsQuerySchema,
} from './records.schema';
import { sendSuccess } from '../../utils/response';
import { formatAsCsv } from './records.export';

export async function listRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listRecordsQuerySchema.parse(req.query);
    const result = await RecordsService.listRecords(query);
    sendSuccess(res, result.records, 200, result.meta);
  } catch (err) {
    next(err);
  }
}

export async function getRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await RecordsService.getRecordById(req.params.id);
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
}

export async function createRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createRecordSchema.parse(req.body);
    const record = await RecordsService.createRecord(input, req.user!.id);
    sendSuccess(res, record, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateRecordSchema.parse(req.body);
    const record = await RecordsService.updateRecord(
      req.params.id,
      input,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
}

export async function deleteRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await RecordsService.softDeleteRecord(req.params.id);
    sendSuccess(res, { message: 'Record soft-deleted successfully', ...result });
  } catch (err) {
    next(err);
  }
}

export async function exportRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listRecordsQuerySchema.parse(req.query);
    const records = await RecordsService.exportRecords(query);
    const csv = formatAsCsv(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="records.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
