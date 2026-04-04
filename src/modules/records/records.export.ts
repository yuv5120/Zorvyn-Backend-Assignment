import { FinancialRecord } from '@prisma/client';

export function formatAsCsv(records: FinancialRecord[]): string {
  if (records.length === 0) {
    return 'ID,Amount,Type,Category,Date,Notes,CreatedAt\n';
  }

  const header = ['ID', 'Amount', 'Type', 'Category', 'Date', 'Notes', 'CreatedAt'].join(',');

  const rows = records.map((r) => {
    return [
      r.id,
      r.amount.toString(),
      r.type,
      `"${r.category.replace(/"/g, '""')}"`,
      r.date.toISOString(),
      `"${(r.notes ?? '').replace(/"/g, '""')}"`,
      r.createdAt.toISOString(),
    ].join(',');
  });

  return [header, ...rows].join('\n') + '\n';
}
