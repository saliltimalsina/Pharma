import { createContext, useContext, useState, ReactNode } from 'react';
import {
  invoices as seedInvoices,
  supplierBills as seedBills,
  payments as seedPayments,
  journalEntries as seedJournalEntries,
  chartOfAccounts as seedAccounts,
  bankAccounts as seedBankAccounts,
  bankTransactions as seedBankTransactions,
  creditNotes as seedCreditNotes,
  debitNotes as seedDebitNotes,
  advances as seedAdvances,
  advanceApplications as seedAdvanceApplications,
  financeEvents as seedFinanceEvents,
} from '../data/mockData';
import type {
  Invoice,
  SupplierBill,
  Payment,
  JournalEntry,
  InvoiceLine,
  Account,
  BankAccount,
  BankTransaction,
  CreditNote,
  DebitNote,
  Advance,
  AdvanceApplication,
  FinanceEvent,
} from '../data/types';

type NewInvoiceStatus = 'Draft' | 'Sent' | 'Proforma';
type NewInvoiceInput = Omit<Invoice, 'id' | 'invoiceNo' | 'status' | 'paid'> & { lines: InvoiceLine[] };
type NewBillInput = Omit<SupplierBill, 'id' | 'billNo' | 'status' | 'paid' | 'poMatch' | 'grnMatch' | 'invoiceMatch' | 'difference'>;
type NewPaymentInput = Omit<Payment, 'id' | 'paymentNo' | 'remainingBalance' | 'status'>;
type NewJournalInput = Omit<JournalEntry, 'id' | 'journalNo' | 'status'>;
type NewCreditNoteInput = Omit<CreditNote, 'id' | 'creditNoteNo' | 'status'>;
type NewDebitNoteInput = Omit<DebitNote, 'id' | 'debitNoteNo' | 'status'>;
type NewAdvanceInput = Omit<Advance, 'id' | 'advanceNo' | 'allocated'>;

// Actor recorded against every audit-trail entry.
const CURRENT_USER = 'Finance Manager';
const today = () => new Date().toISOString().slice(0, 10);

interface FinanceContextValue {
  invoices: Invoice[];
  supplierBills: SupplierBill[];
  payments: Payment[];
  journalEntries: JournalEntry[];
  chartOfAccounts: Account[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  creditNotes: CreditNote[];
  debitNotes: DebitNote[];
  advances: Advance[];
  advanceApplications: AdvanceApplication[];
  financeEvents: FinanceEvent[];
  addInvoice: (input: NewInvoiceInput, status: NewInvoiceStatus) => string;
  convertProforma: (id: string) => void;
  addBill: (input: NewBillInput) => string;
  approveBill: (id: string) => void;
  addPayment: (input: NewPaymentInput) => string;
  addJournalEntry: (input: NewJournalInput) => string;
  addCreditNote: (input: NewCreditNoteInput) => string;
  addDebitNote: (input: NewDebitNoteInput) => string;
  addAdvance: (input: NewAdvanceInput) => string;
  applyAdvance: (advanceId: string, targetRef: string, amount: number) => void;
  toggleReconciled: (txnId: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

let invoiceSeq = seedInvoices.length;
let billSeq = seedBills.length;
let paymentSeq = seedPayments.length;
let journalSeq = seedJournalEntries.length;
let bankTxnSeq = seedBankTransactions.length;
let creditNoteSeq = seedCreditNotes.length;
let debitNoteSeq = seedDebitNotes.length;
let advanceSeq = seedAdvances.length;
let advanceAppSeq = seedAdvanceApplications.length;
let eventSeq = seedFinanceEvents.length;

// Double-entry balance effect of debiting/crediting an account, by account nature.
function applyEntry(account: Account, isDebit: boolean, amount: number): Account {
  const debitPositive = account.type === 'Asset' || account.type === 'Expense';
  const sign = isDebit === debitPositive ? 1 : -1;
  return { ...account, balance: account.balance + sign * amount };
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>(seedInvoices);
  const [supplierBills, setSupplierBills] = useState<SupplierBill[]>(seedBills);
  const [payments, setPayments] = useState<Payment[]>(seedPayments);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(seedJournalEntries);
  const [chartOfAccounts, setChartOfAccounts] = useState<Account[]>(seedAccounts);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(seedBankAccounts);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(seedBankTransactions);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(seedCreditNotes);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>(seedDebitNotes);
  const [advances, setAdvances] = useState<Advance[]>(seedAdvances);
  const [advanceApplications, setAdvanceApplications] = useState<AdvanceApplication[]>(seedAdvanceApplications);
  const [financeEvents, setFinanceEvents] = useState<FinanceEvent[]>(seedFinanceEvents);

  // Append an audit-trail entry. The event object is built OUTSIDE the state
  // updater (counter incremented here, not inside the updater) to stay StrictMode-safe.
  const logEvent = (type: string, entity: string, ref: string, date: string = today()) => {
    eventSeq += 1;
    const event: FinanceEvent = {
      id: `EVT-${String(eventSeq).padStart(3, '0')}`,
      date,
      type,
      entity,
      ref,
      by: CURRENT_USER,
    };
    setFinanceEvents((prev) => [event, ...prev]);
  };

  const addInvoice: FinanceContextValue['addInvoice'] = (input, status) => {
    invoiceSeq += 1;
    const id = `INV-${String(invoiceSeq).padStart(3, '0')}`;
    const invoiceNo = `INV-2026-10${43 + (invoiceSeq - seedInvoices.length)}`;
    const invoice: Invoice = { ...input, id, invoiceNo, status, paid: 0, credited: 0 };
    setInvoices((prev) => [invoice, ...prev]);
    logEvent('Created', status === 'Proforma' ? 'Proforma Invoice' : 'Invoice', invoiceNo, input.invoiceDate);
    return id;
  };

  // Turn a proforma invoice into a real Sent invoice so it begins counting toward AR.
  const convertProforma: FinanceContextValue['convertProforma'] = (id) => {
    const target = invoices.find((i) => i.id === id);
    setInvoices((prev) => prev.map((i) => (i.id === id && i.status === 'Proforma' ? { ...i, status: 'Sent' } : i)));
    if (target) logEvent('Converted', 'Invoice', target.invoiceNo);
  };

  const addBill: FinanceContextValue['addBill'] = (input) => {
    billSeq += 1;
    const id = `BILL-${String(billSeq).padStart(3, '0')}`;
    const billNo = `BILL-2026-05${13 + (billSeq - seedBills.length)}`;
    const bill: SupplierBill = {
      ...input,
      id,
      billNo,
      status: 'Pending Verification',
      paid: 0,
      poMatch: input.poNumber !== '',
      grnMatch: input.grnNumber !== '' && input.grnNumber !== '—',
      invoiceMatch: true,
      difference: 0,
      credited: 0,
    };
    setSupplierBills((prev) => [bill, ...prev]);
    logEvent('Created', 'Bill', billNo, input.invoiceDate);
    return id;
  };

  const approveBill: FinanceContextValue['approveBill'] = (id) => {
    const target = supplierBills.find((b) => b.id === id);
    setSupplierBills((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'Approved' } : b)));
    if (target) logEvent('Approved', 'Bill', target.billNo);
  };

  const addPayment: FinanceContextValue['addPayment'] = (input) => {
    paymentSeq += 1;
    const id = `PAY-${String(paymentSeq).padStart(3, '0')}`;
    const paymentNo = `PAY-2026-33${paymentSeq}`;
    const remainingBalance = input.outstandingBalance - input.amount;
    const payment: Payment = { ...input, id, paymentNo, remainingBalance, status: 'Completed' };
    setPayments((prev) => [payment, ...prev]);

    if (input.type === 'Customer Payment') {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.invoiceNo !== input.invoiceOrBillRef) return inv;
          const paid = inv.paid + input.amount;
          const settled = paid + (inv.credited ?? 0);
          return { ...inv, paid, status: settled >= inv.amount ? 'Paid' : 'Partially Paid' };
        }),
      );
    } else if (input.type === 'Supplier Payment') {
      setSupplierBills((prev) =>
        prev.map((bill) => {
          if (bill.billNo !== input.invoiceOrBillRef) return bill;
          const paid = bill.paid + input.amount;
          const settled = paid + (bill.credited ?? 0);
          return { ...bill, paid, status: settled >= bill.amount ? 'Paid' : 'Partially Paid' };
        }),
      );
    }

    // Record the cash movement.
    const inflow = input.type === 'Customer Payment' || input.type === 'Advance Payment';
    const outflow = input.type === 'Supplier Payment' || input.type === 'Refund';
    if (input.method === 'Cash' && (inflow || outflow)) {
      // Cash payments move the 'Cash on Hand' ledger account so the cash book reconciles.
      const delta = inflow ? input.amount : -input.amount;
      setChartOfAccounts((prev) =>
        prev.map((a) => (a.code === '1000' ? { ...a, balance: a.balance + delta } : a)),
      );
    } else {
      const bank = bankAccounts.find((b) => b.bankName === input.bank);
      if ((inflow || outflow) && bank && input.bank !== '—') {
        const newBalance = bank.balance + (inflow ? input.amount : -input.amount);
        bankTxnSeq += 1;
        const txn: BankTransaction = {
          id: `BTX-${String(bankTxnSeq).padStart(3, '0')}`,
          bankAccountId: bank.id,
          transactionId: input.transactionId || `TXN-${90000 + bankTxnSeq}`,
          date: input.date,
          description: `${input.type} — ${input.partyName || input.invoiceOrBillRef}`,
          debit: outflow ? input.amount : 0,
          credit: inflow ? input.amount : 0,
          balance: newBalance,
          reconciled: false,
        };
        setBankTransactions((prevTxns) => [txn, ...prevTxns]);
        setBankAccounts((prevBanks) =>
          prevBanks.map((b) => (b.id === bank.id ? { ...b, balance: newBalance } : b)),
        );
      }
    }
    logEvent('Payment', 'Payment', paymentNo, input.date);
    return id;
  };

  // Posting a journal entry moves the two affected chart-of-account balances.
  const addJournalEntry: FinanceContextValue['addJournalEntry'] = (input) => {
    journalSeq += 1;
    const id = `JE-${String(journalSeq).padStart(3, '0')}`;
    const journalNo = `JE-2026-08${13 + (journalSeq - seedJournalEntries.length)}`;
    const entry: JournalEntry = { ...input, id, journalNo, status: 'Posted' };
    setJournalEntries((prev) => [entry, ...prev]);
    setChartOfAccounts((prev) =>
      prev.map((acc) => {
        if (acc.name === input.debitAccount) return applyEntry(acc, true, input.amount);
        if (acc.name === input.creditAccount) return applyEntry(acc, false, input.amount);
        return acc;
      }),
    );
    logEvent('Posted', 'Journal', journalNo, input.date);
    return id;
  };

  // Customer credit note: neutralises part of a target invoice's outstanding balance and
  // posts the reverse of the original sale (Accounts Receivable down, Sales Revenue down).
  const addCreditNote: FinanceContextValue['addCreditNote'] = (input) => {
    creditNoteSeq += 1;
    const id = `CN-${String(creditNoteSeq).padStart(3, '0')}`;
    const creditNoteNo = `CN-2026-${String(creditNoteSeq).padStart(3, '0')}`;
    const note: CreditNote = { ...input, id, creditNoteNo, status: 'Issued' };
    setCreditNotes((prev) => [note, ...prev]);

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.invoiceNo !== input.invoiceNo) return inv;
        const credited = (inv.credited ?? 0) + input.amount;
        const settled = inv.paid + credited;
        const status = settled >= inv.amount && inv.amount > 0 ? 'Paid' : inv.status;
        return { ...inv, credited, status };
      }),
    );
    // Reverse ledger effect: reduce AR (1200, asset -> credit) and Sales Revenue (4000 -> debit).
    setChartOfAccounts((prev) =>
      prev.map((acc) => {
        if (acc.code === '1200') return applyEntry(acc, false, input.amount);
        if (acc.code === '4000') return applyEntry(acc, true, input.amount);
        return acc;
      }),
    );
    logEvent('Credit Note', 'Credit Note', creditNoteNo, input.date);
    return id;
  };

  // Supplier debit note: neutralises part of a target bill's outstanding balance and
  // posts the reverse of the original purchase accrual (Accounts Payable down, COGS down).
  const addDebitNote: FinanceContextValue['addDebitNote'] = (input) => {
    debitNoteSeq += 1;
    const id = `DN-${String(debitNoteSeq).padStart(3, '0')}`;
    const debitNoteNo = `DN-2026-${String(debitNoteSeq).padStart(3, '0')}`;
    const note: DebitNote = { ...input, id, debitNoteNo, status: 'Issued' };
    setDebitNotes((prev) => [note, ...prev]);

    setSupplierBills((prev) =>
      prev.map((bill) => {
        if (bill.billNo !== input.billNo) return bill;
        const credited = (bill.credited ?? 0) + input.amount;
        const settled = bill.paid + credited;
        const status = settled >= bill.amount && bill.amount > 0 ? 'Paid' : bill.status;
        return { ...bill, credited, status };
      }),
    );
    // Reverse ledger effect: reduce AP (2000, liability -> debit) and COGS (5000 -> credit).
    setChartOfAccounts((prev) =>
      prev.map((acc) => {
        if (acc.code === '2000') return applyEntry(acc, true, input.amount);
        if (acc.code === '5000') return applyEntry(acc, false, input.amount);
        return acc;
      }),
    );
    logEvent('Debit Note', 'Debit Note', debitNoteNo, input.date);
    return id;
  };

  // Record an advance receipt/payment as an unallocated credit held for a party.
  const addAdvance: FinanceContextValue['addAdvance'] = (input) => {
    advanceSeq += 1;
    const id = `ADV-${String(advanceSeq).padStart(3, '0')}`;
    const advanceNo = `ADV-2026-${String(advanceSeq).padStart(3, '0')}`;
    const advance: Advance = { ...input, id, advanceNo, allocated: 0 };
    setAdvances((prev) => [advance, ...prev]);

    // Cash side: a customer advance is an inflow, a supplier advance an outflow.
    const inflow = input.direction === 'Customer';
    if (input.method === 'Cash') {
      const delta = inflow ? input.amount : -input.amount;
      setChartOfAccounts((prev) =>
        prev.map((a) => (a.code === '1000' ? { ...a, balance: a.balance + delta } : a)),
      );
    } else {
      const bank = bankAccounts.find((b) => b.bankName === input.bank);
      if (bank && input.bank !== '—') {
        const newBalance = bank.balance + (inflow ? input.amount : -input.amount);
        bankTxnSeq += 1;
        const txn: BankTransaction = {
          id: `BTX-${String(bankTxnSeq).padStart(3, '0')}`,
          bankAccountId: bank.id,
          transactionId: `TXN-${90000 + bankTxnSeq}`,
          date: input.date,
          description: `Advance (${input.direction}) — ${input.partyName}`,
          debit: inflow ? 0 : input.amount,
          credit: inflow ? input.amount : 0,
          balance: newBalance,
          reconciled: false,
        };
        setBankTransactions((prevTxns) => [txn, ...prevTxns]);
        setBankAccounts((prevBanks) =>
          prevBanks.map((b) => (b.id === bank.id ? { ...b, balance: newBalance } : b)),
        );
      }
    }
    logEvent('Advance', 'Advance', advanceNo, input.date);
    return id;
  };

  // Apply an unallocated advance against an open invoice (customer) or bill (supplier),
  // reducing that document's outstanding balance.
  const applyAdvance: FinanceContextValue['applyAdvance'] = (advanceId, targetRef, amount) => {
    const advance = advances.find((a) => a.id === advanceId);
    if (!advance || amount <= 0) return;
    const remaining = advance.amount - advance.allocated;
    const applied = Math.min(amount, remaining);
    if (applied <= 0) return;

    setAdvances((prev) =>
      prev.map((a) => (a.id === advanceId ? { ...a, allocated: a.allocated + applied } : a)),
    );

    advanceAppSeq += 1;
    const application: AdvanceApplication = {
      id: `ADVAP-${String(advanceAppSeq).padStart(3, '0')}`,
      advanceId,
      advanceNo: advance.advanceNo,
      date: today(),
      targetRef,
      amount: applied,
    };
    setAdvanceApplications((prev) => [application, ...prev]);

    if (advance.direction === 'Customer') {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.invoiceNo !== targetRef) return inv;
          const credited = (inv.credited ?? 0) + applied;
          const settled = inv.paid + credited;
          const status = settled >= inv.amount && inv.amount > 0 ? 'Paid' : inv.status;
          return { ...inv, credited, status };
        }),
      );
    } else {
      setSupplierBills((prev) =>
        prev.map((bill) => {
          if (bill.billNo !== targetRef) return bill;
          const credited = (bill.credited ?? 0) + applied;
          const settled = bill.paid + credited;
          const status = settled >= bill.amount && bill.amount > 0 ? 'Paid' : bill.status;
          return { ...bill, credited, status };
        }),
      );
    }
    logEvent('Advance Applied', 'Advance', `${advance.advanceNo} → ${targetRef}`);
  };

  // Flip the reconciled flag on a bank transaction (bank reconciliation).
  const toggleReconciled: FinanceContextValue['toggleReconciled'] = (txnId) => {
    const target = bankTransactions.find((t) => t.id === txnId);
    setBankTransactions((prev) =>
      prev.map((t) => (t.id === txnId ? { ...t, reconciled: !t.reconciled } : t)),
    );
    if (target) logEvent(target.reconciled ? 'Unreconciled' : 'Reconciled', 'Bank Txn', target.transactionId);
  };

  return (
    <FinanceContext.Provider
      value={{
        invoices,
        supplierBills,
        payments,
        journalEntries,
        chartOfAccounts,
        bankAccounts,
        bankTransactions,
        creditNotes,
        debitNotes,
        advances,
        advanceApplications,
        financeEvents,
        addInvoice,
        convertProforma,
        addBill,
        approveBill,
        addPayment,
        addJournalEntry,
        addCreditNote,
        addDebitNote,
        addAdvance,
        applyAdvance,
        toggleReconciled,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
