import {
  CashShift, Transaction, Expense, CashWithdrawal,
  Debt, ClientDebt, DailyDebtAccrual, ParkingSession,
  AdminCashOperation, SalaryAdvance, SalaryPayment,
  Tariffs, MonthlySubscription,
} from '@/types';
import { roundMoney, calculateDays } from './helpers';

type DateRange = {
  fromDate?: Date;
  toDate?: Date;
};

export type FinanceSnapshotInput = DateRange & {
  currentShift: CashShift | null;
  shifts: CashShift[];
  transactions: Transaction[];
  expenses: Expense[];
  withdrawals: CashWithdrawal[];
  adminCashOperations: AdminCashOperation[];
  salaryAdvances: SalaryAdvance[];
  salaryPayments: SalaryPayment[];
};

export type RevenueFinancials = {
  cashRevenue: number;
  cardRevenue: number;
  adjustmentRevenue: number;
  grossRevenue: number;
  cancelledCash: number;
  cancelledCard: number;
  cancelledAdjustment: number;
  cancelledTotal: number;
  refundedCash: number;
  refundedCard: number;
  refundedTotal: number;
  managerExpenses: number;
  adminExpenses: number;
  expensesTotal: number;
  salaryAdvanceTotal: number;
  salaryPaymentTotal: number;
  netRevenue: number;
};

export type ManagerCashFinancials = {
  isOpen: boolean;
  shiftId: string | null;
  carryOver: number;
  acceptedCash: number;
  cashRevenue: number;
  cardRevenue: number;
  cancelledCash: number;
  refundedCash: number;
  managerExpenses: number;
  withdrawalsToAdmin: number;
  otherWithdrawals: number;
  withdrawalsTotal: number;
  currentShiftCashDelta: number;
  currentBalance: number;
};

export type AdminCashFinancials = {
  cashFromManagers: number;
  cardRevenue: number;
  cardIncome: number;
  cashExpenses: number;
  cardExpenses: number;
  adminExpenses: number;
  salaryAdvanceCash: number;
  salaryAdvanceCard: number;
  salaryAdvanceTotal: number;
  salaryPaymentCash: number;
  salaryPaymentCard: number;
  salaryPaymentTotal: number;
  cashBalance: number;
  cardBalance: number;
  totalBalance: number;
  balance: number;
  operations: AdminCashOperation[];
};

export type FinanceSnapshot = {
  revenue: RevenueFinancials;
  managerCash: ManagerCashFinancials;
  adminCash: AdminCashFinancials;
  totalCash: {
    managerCashBalance: number;
    adminCashBalance: number;
    physicalCash: number;
    systemBalance: number;
  };
};

function inDateRange(dateStr: string, fromDate?: Date, toDate?: Date): boolean {
  const d = new Date(dateStr).getTime();
  if (fromDate && d < fromDate.getTime()) return false;
  if (toDate && d > toDate.getTime()) return false;
  return true;
}

function isRevenueTransaction(transaction: Transaction): boolean {
  return ['payment', 'debt_payment'].includes(transaction.type);
}

function sumTransactions(
  transactions: Transaction[],
  predicate: (transaction: Transaction) => boolean,
): number {
  return roundMoney(transactions.filter(predicate).reduce((sum, transaction) => sum + transaction.amount, 0));
}

function sumAdminOps(
  operations: AdminCashOperation[],
  predicate: (operation: AdminCashOperation) => boolean,
): number {
  return roundMoney(operations.filter(predicate).reduce((sum, operation) => sum + operation.amount, 0));
}

export function getShiftTransactions(
  shift: CashShift,
  transactions: Transaction[],
): Transaction[] {
  return transactions.filter(t => {
    if (t.shiftId === shift.id) return true;
    const tDate = new Date(t.date).getTime();
    const openDate = new Date(shift.openedAt).getTime();
    const closeDate = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();
    return tDate >= openDate && tDate <= closeDate;
  });
}

export function calculateRevenueFinancials(
  transactions: Transaction[],
  expenses: Expense[],
  adminCashOperations: AdminCashOperation[],
  salaryAdvances: SalaryAdvance[],
  salaryPayments: SalaryPayment[],
  fromDate?: Date,
  toDate?: Date,
): RevenueFinancials {
  const filteredTx = transactions.filter(t => inDateRange(t.date, fromDate, toDate));
  const filteredExpenses = expenses.filter(e => inDateRange(e.date, fromDate, toDate));
  const filteredAdminOps = adminCashOperations.filter(o => inDateRange(o.date, fromDate, toDate));
  const filteredSalaryAdvances = salaryAdvances.filter(a => inDateRange(a.issuedAt, fromDate, toDate));
  const filteredSalaryPayments = salaryPayments.filter(p => inDateRange(p.paidAt, fromDate, toDate));

  const cashRevenue = sumTransactions(filteredTx, t => isRevenueTransaction(t) && t.method === 'cash');
  const cardRevenue = sumTransactions(filteredTx, t => isRevenueTransaction(t) && t.method === 'card');
  const adjustmentRevenue = sumTransactions(filteredTx, t => isRevenueTransaction(t) && t.method === 'adjustment');
  const grossRevenue = roundMoney(cashRevenue + cardRevenue + adjustmentRevenue);

  const cancelledCash = sumTransactions(filteredTx, t => t.type === 'cancel_payment' && t.method === 'cash');
  const cancelledCard = sumTransactions(filteredTx, t => t.type === 'cancel_payment' && t.method === 'card');
  const cancelledAdjustment = sumTransactions(filteredTx, t => t.type === 'cancel_payment' && t.method === 'adjustment');
  const cancelledTotal = roundMoney(cancelledCash + cancelledCard + cancelledAdjustment);

  const refundedCash = sumTransactions(filteredTx, t => t.type === 'refund' && t.method === 'cash');
  const refundedCard = sumTransactions(filteredTx, t => t.type === 'refund' && t.method === 'card');
  const refundedTotal = roundMoney(refundedCash + refundedCard);

  const managerExpenses = roundMoney(
    filteredExpenses
      .filter(e => e.type === 'manager' || !e.type)
      .reduce((sum, expense) => sum + expense.amount, 0)
  );
  const adminExpenses = sumAdminOps(filteredAdminOps, o => o.type === 'admin_expense');
  const expensesTotal = roundMoney(managerExpenses + adminExpenses);

  const salaryAdvanceTotal = roundMoney(filteredSalaryAdvances.reduce((sum, advance) => sum + advance.amount, 0));
  const salaryPaymentTotal = roundMoney(filteredSalaryPayments.reduce((sum, payment) => sum + payment.netPaid, 0));
  const netRevenue = roundMoney(
    grossRevenue - cancelledTotal - refundedTotal - expensesTotal - salaryAdvanceTotal - salaryPaymentTotal
  );

  return {
    cashRevenue,
    cardRevenue,
    adjustmentRevenue,
    grossRevenue,
    cancelledCash,
    cancelledCard,
    cancelledAdjustment,
    cancelledTotal,
    refundedCash,
    refundedCard,
    refundedTotal,
    managerExpenses,
    adminExpenses,
    expensesTotal,
    salaryAdvanceTotal,
    salaryPaymentTotal,
    netRevenue,
  };
}

export function calculateShiftClosingSummary(
  shift: CashShift,
  transactions: Transaction[],
  expenses: Expense[],
  withdrawals: CashWithdrawal[],
): {
  cashIncome: number;
  cardIncome: number;
  totalExpenses: number;
  totalWithdrawals: number;
  cancelledCash: number;
  refundedCash: number;
  calculatedBalance: number;
} {
  const shiftTx = getShiftTransactions(shift, transactions);

  const cashIncome = shiftTx
    .filter(t => ['payment', 'debt_payment'].includes(t.type) && t.method === 'cash')
    .reduce((s, t) => s + t.amount, 0);

  const cardIncome = shiftTx
    .filter(t => ['payment', 'debt_payment'].includes(t.type) && t.method === 'card')
    .reduce((s, t) => s + t.amount, 0);

  const cancelled = shiftTx
    .filter(t => t.type === 'cancel_payment' && t.method === 'cash')
    .reduce((s, t) => s + t.amount, 0);

  const refunded = shiftTx
    .filter(t => t.type === 'refund' && t.method === 'cash')
    .reduce((s, t) => s + t.amount, 0);

  const shiftExpenses = expenses
    .filter(e => e.shiftId === shift.id)
    .reduce((s, e) => s + e.amount, 0);

  const shiftWithdrawals = withdrawals
    .filter(w => w.shiftId === shift.id)
    .reduce((s, w) => s + w.amount, 0);

  const startBalance = shift.acceptedCash ?? shift.carryOver;
  const calculatedBalance = roundMoney(startBalance + cashIncome - cancelled - refunded - shiftExpenses - shiftWithdrawals);

  return {
    cashIncome: roundMoney(cashIncome),
    cardIncome: roundMoney(cardIncome),
    totalExpenses: roundMoney(shiftExpenses),
    totalWithdrawals: roundMoney(shiftWithdrawals),
    cancelledCash: roundMoney(cancelled),
    refundedCash: roundMoney(refunded),
    calculatedBalance,
  };
}

export function calculateManagerCashFinancials(
  currentShift: CashShift | null,
  transactions: Transaction[],
  expenses: Expense[],
  withdrawals: CashWithdrawal[],
  adminCashOperations: AdminCashOperation[],
): ManagerCashFinancials {
  if (!currentShift) {
    return {
      isOpen: false,
      shiftId: null,
      carryOver: 0,
      acceptedCash: 0,
      cashRevenue: 0,
      cardRevenue: 0,
      cancelledCash: 0,
      refundedCash: 0,
      managerExpenses: 0,
      withdrawalsToAdmin: 0,
      otherWithdrawals: 0,
      withdrawalsTotal: 0,
      currentShiftCashDelta: 0,
      currentBalance: 0,
    };
  }

  const summary = calculateShiftClosingSummary(currentShift, transactions, expenses, withdrawals);
  const acceptedCash = currentShift.acceptedCash ?? currentShift.carryOver ?? 0;
  const shiftWithdrawalIds = new Set(
    withdrawals
      .filter(w => w.shiftId === currentShift.id)
      .map(w => `${roundMoney(w.amount)}|${w.date}`)
  );
  const withdrawalsToAdmin = sumAdminOps(
    adminCashOperations,
    operation => (
      operation.type === 'cash_withdrawal_from_manager' &&
      operation.method === 'cash' &&
      shiftWithdrawalIds.has(`${roundMoney(operation.amount)}|${operation.date}`)
    )
  );
  const otherWithdrawals = roundMoney(Math.max(0, summary.totalWithdrawals - withdrawalsToAdmin));
  const currentShiftCashDelta = roundMoney(summary.calculatedBalance - acceptedCash);

  return {
    isOpen: true,
    shiftId: currentShift.id,
    carryOver: roundMoney(currentShift.carryOver ?? 0),
    acceptedCash: roundMoney(acceptedCash),
    cashRevenue: summary.cashIncome,
    cardRevenue: summary.cardIncome,
    cancelledCash: summary.cancelledCash,
    refundedCash: summary.refundedCash,
    managerExpenses: summary.totalExpenses,
    withdrawalsToAdmin,
    otherWithdrawals,
    withdrawalsTotal: summary.totalWithdrawals,
    currentShiftCashDelta,
    currentBalance: summary.calculatedBalance,
  };
}

export function calculateShiftCashBalance(
  shift: CashShift,
  transactions: Transaction[],
  expenses: Expense[],
  withdrawals: CashWithdrawal[],
): number {
  return calculateShiftClosingSummary(shift, transactions, expenses, withdrawals).calculatedBalance;
}

export function calculateClientDebtBreakdown(
  clientId: string,
  debts: Debt[],
  clientDebts: ClientDebt[],
  sessions: ParkingSession[],
  dailyDebtAccruals: DailyDebtAccrual[],
  tariffs: Tariffs,
): {
  oldDebtsTotal: number;
  clientDebtTotal: number;
  overstayTotal: number;
  total: number;
} {
  const activeSessions = sessions.filter(
    s => s.clientId === clientId && ['active', 'active_debt'].includes(s.status) && !s.cancelled
  );
  const activeSessionIds = new Set(activeSessions.map(s => s.id));

  const oldDebtsTotal = debts
    .filter(d => d.clientId === clientId && d.status === 'active' && !activeSessionIds.has(d.parkingEntryId ?? ''))
    .reduce((s, d) => s + d.remainingAmount, 0);

  const cd = clientDebts.find(c => c.clientId === clientId);
  const clientDebtTotal = cd?.totalAmount ?? 0;

  let overstayTotal = 0;
  for (const session of activeSessions) {
    if (session.serviceType === 'onetime') {
      const days = calculateDays(session.entryTime);
      const standardRate = session.prepaidMethod === 'card' ? tariffs.onetimeCard : tariffs.onetimeCash;
      const rate = (session.customRate !== undefined && session.isDiscounted) ? session.customRate : standardRate;
      const totalOwed = days * rate;
      const paidDebts = debts
        .filter(d => d.parkingEntryId === session.id && d.status === 'paid')
        .reduce((s, d) => s + d.totalAmount, 0);
      const owing = Math.max(0, totalOwed - Math.max(session.prepaidAmount, paidDebts));
      overstayTotal += owing;
    }
  }

  const sessionDebtTotal = clientDebtTotal;
  const standaloneDebtTotal = oldDebtsTotal;
  const total = roundMoney(standaloneDebtTotal + sessionDebtTotal + overstayTotal);

  return {
    oldDebtsTotal: roundMoney(standaloneDebtTotal),
    clientDebtTotal: roundMoney(sessionDebtTotal),
    overstayTotal: roundMoney(overstayTotal),
    total,
  };
}

export function calculateAdminCashRegister(
  adminOps: AdminCashOperation[],
  transactions: Transaction[],
  salaryAdvances: SalaryAdvance[],
  salaryPayments: SalaryPayment[],
  fromDate?: Date,
  toDate?: Date,
): AdminCashFinancials {
  const filteredOps = adminOps.filter(o => inDateRange(o.date, fromDate, toDate));
  const filteredTx = transactions.filter(t => inDateRange(t.date, fromDate, toDate));
  const filteredSalaryAdvances = salaryAdvances.filter(a => inDateRange(a.issuedAt, fromDate, toDate));
  const filteredSalaryPayments = salaryPayments.filter(p => inDateRange(p.paidAt, fromDate, toDate));

  const cashFromManagers = sumAdminOps(
    filteredOps,
    o => o.type === 'cash_withdrawal_from_manager' && o.method === 'cash'
  );
  const cardRevenue = sumTransactions(
    filteredTx,
    t => isRevenueTransaction(t) && t.method === 'card'
  );

  const cashExpenses = sumAdminOps(
    filteredOps,
    o => o.type === 'admin_expense' && o.method === 'cash'
  );
  const cardExpenses = sumAdminOps(
    filteredOps,
    o => o.type === 'admin_expense' && o.method === 'card'
  );

  const salaryAdvanceCash = roundMoney(
    filteredSalaryAdvances
      .filter(advance => advance.method === 'cash')
      .reduce((sum, advance) => sum + advance.amount, 0)
  );
  const salaryAdvanceCard = roundMoney(
    filteredSalaryAdvances
      .filter(advance => advance.method === 'card')
      .reduce((sum, advance) => sum + advance.amount, 0)
  );
  const salaryPaymentCash = roundMoney(
    filteredSalaryPayments
      .filter(payment => payment.method === 'cash')
      .reduce((sum, payment) => sum + payment.netPaid, 0)
  );
  const salaryPaymentCard = roundMoney(
    filteredSalaryPayments
      .filter(payment => payment.method === 'card')
      .reduce((sum, payment) => sum + payment.netPaid, 0)
  );

  const cashBalance = roundMoney(cashFromManagers - cashExpenses - salaryAdvanceCash - salaryPaymentCash);
  const cardBalance = roundMoney(cardRevenue - cardExpenses - salaryAdvanceCard - salaryPaymentCard);
  const totalBalance = roundMoney(cashBalance + cardBalance);

  return {
    cashFromManagers,
    cardRevenue,
    cardIncome: cardRevenue,
    cashExpenses,
    cardExpenses,
    adminExpenses: roundMoney(cashExpenses + cardExpenses),
    salaryAdvanceCash,
    salaryAdvanceCard,
    salaryAdvanceTotal: roundMoney(salaryAdvanceCash + salaryAdvanceCard),
    salaryPaymentCash,
    salaryPaymentCard,
    salaryPaymentTotal: roundMoney(salaryPaymentCash + salaryPaymentCard),
    cashBalance,
    cardBalance,
    totalBalance,
    balance: totalBalance,
    operations: filteredOps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  };
}

export function calculateFinanceSnapshot(input: FinanceSnapshotInput): FinanceSnapshot {
  const revenue = calculateRevenueFinancials(
    input.transactions,
    input.expenses,
    input.adminCashOperations,
    input.salaryAdvances,
    input.salaryPayments,
    input.fromDate,
    input.toDate,
  );
  const managerCash = calculateManagerCashFinancials(
    input.currentShift,
    input.transactions,
    input.expenses,
    input.withdrawals,
    input.adminCashOperations,
  );
  const adminCash = calculateAdminCashRegister(
    input.adminCashOperations,
    input.transactions,
    input.salaryAdvances,
    input.salaryPayments,
    input.fromDate,
    input.toDate,
  );
  const physicalCash = roundMoney(managerCash.currentBalance + adminCash.cashBalance);
  const adminCashBalance = adminCash.cashBalance;
  const systemBalance = roundMoney(physicalCash + adminCash.cardBalance);

  return {
    revenue,
    managerCash,
    adminCash,
    totalCash: {
      managerCashBalance: managerCash.currentBalance,
      adminCashBalance,
      physicalCash,
      systemBalance,
    },
  };
}

export function calculateActiveSessionDebt(
  session: ParkingSession,
  tariffs: Tariffs,
  subscriptions: MonthlySubscription[],
  debts: Debt[],
): number {
  const debtPaidOnSession = debts
    .filter(d => d.parkingEntryId === session.id)
    .reduce((s, d) => s + Math.max(0, d.totalAmount - d.remainingAmount), 0);
  const totalPaid = session.prepaidAmount + debtPaidOnSession;

  if (session.serviceType === 'lombard' || session.status === 'active_debt') {
    const rate = session.lombardRateApplied || tariffs.lombardRate;
    const days = calculateDays(session.entryTime, undefined, true);
    return roundMoney(Math.max(0, days * rate - totalPaid));
  }

  if (session.serviceType === 'onetime') {
    const standardRate = session.prepaidMethod === 'card' ? tariffs.onetimeCard : tariffs.onetimeCash;
    const rate = (session.customRate !== undefined && session.isDiscounted) ? session.customRate : standardRate;
    const days = calculateDays(session.entryTime);
    return roundMoney(Math.max(0, days * rate - totalPaid));
  }

  if (session.serviceType === 'monthly') {
    const sub = subscriptions.find(
      s => s.clientId === session.clientId && s.carId === session.carId
    );
    if (sub) {
      const paidUntil = new Date(sub.paidUntil);
      const now = new Date();
      if (now > paidUntil) {
        const dailyRate = session.prepaidMethod === 'card' ? tariffs.monthlyCard : tariffs.monthlyCash;
        const msOverdue = now.getTime() - paidUntil.getTime();
        const daysOverdue = Math.max(1, Math.ceil(msOverdue / (24 * 60 * 60 * 1000)));
        return roundMoney(daysOverdue * dailyRate);
      }
      return 0;
    }
    const dailyRate = session.prepaidMethod === 'card' ? tariffs.monthlyCard : tariffs.monthlyCash;
    const days = calculateDays(session.entryTime);
    return roundMoney(Math.max(0, days * dailyRate - totalPaid));
  }

  return 0;
}

export type PeriodKey = 'today' | 'week' | 'month' | 'all';

export function getDateRangeForPeriod(period: PeriodKey): { from: Date | undefined; to: Date | undefined } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { from: today, to: undefined };
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: weekAgo, to: undefined };
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { from: monthAgo, to: undefined };
    }
    case 'all':
      return { from: undefined, to: undefined };
  }
}
