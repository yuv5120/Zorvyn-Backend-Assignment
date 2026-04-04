import { prisma } from '../../config/prisma';

// Base filter: always exclude soft-deleted records
const notDeleted = { deletedAt: null };

/**
 * Returns total income, total expenses, and net balance.
 * All roles can access this.
 */
export async function getSummary() {
  const [incomeResult, expenseResult] = await Promise.all([
    prisma.financialRecord.aggregate({
      where: { ...notDeleted, type: 'INCOME' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financialRecord.aggregate({
      where: { ...notDeleted, type: 'EXPENSE' },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalIncome = incomeResult._sum.amount ?? 0;
  const totalExpenses = expenseResult._sum.amount ?? 0;

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    incomeCount: incomeResult._count,
    expenseCount: expenseResult._count,
    totalTransactions: incomeResult._count + expenseResult._count,
  };
}

/**
 * Returns income and expense totals grouped by category.
 * All roles can access this.
 */
export async function getByCategory() {
  const records = await prisma.financialRecord.groupBy({
    by: ['category', 'type'],
    where: notDeleted,
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
  });

  // Reshape into { category, income, expense, net, count }
  const map = new Map<
    string,
    { category: string; income: number; expense: number; net: number; count: number }
  >();

  for (const r of records) {
    const existing = map.get(r.category) ?? {
      category: r.category,
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
    };

    if (r.type === 'INCOME') {
      existing.income += r._sum.amount ?? 0;
    } else {
      existing.expense += r._sum.amount ?? 0;
    }
    existing.count += r._count;
    existing.net = existing.income - existing.expense;
    map.set(r.category, existing);
  }

  return Array.from(map.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

/**
 * Returns monthly income/expense totals for the last N months.
 * Analyst and Admin only.
 */
export async function getMonthlyTrends(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const records = await prisma.financialRecord.findMany({
    where: { ...notDeleted, date: { gte: since } },
    select: { amount: true, type: true, date: true },
  });

  // Group by YYYY-MM
  const map = new Map<
    string,
    { month: string; income: number; expense: number; net: number }
  >();

  for (const r of records) {
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
    const existing = map.get(key) ?? { month: key, income: 0, expense: 0, net: 0 };

    if (r.type === 'INCOME') {
      existing.income += r.amount;
    } else {
      existing.expense += r.amount;
    }
    existing.net = existing.income - existing.expense;
    map.set(key, existing);
  }

  // Return sorted ascending by month so charts render correctly
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Returns the N most recent non-deleted transactions.
 * All roles can access this.
 */
export async function getRecentActivity(limit = 10) {
  return prisma.financialRecord.findMany({
    where: notDeleted,
    select: {
      id: true,
      amount: true,
      type: true,
      category: true,
      date: true,
      notes: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take: Math.min(50, Math.max(1, limit)),
  });
}
