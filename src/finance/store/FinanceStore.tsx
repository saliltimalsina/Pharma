import { createContext, useContext, useState, ReactNode } from 'react';
import {
  invoices as seedInvoices,
  supplierBills as seedBills,
  payments as seedPayments,
  journalEntries as seedJournalEntries,
  chartOfAccounts as seedAccounts,
  bankAccounts as seedBankAccounts,
  bankTransactions as seedBankTransactions,
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
} from '../data/types';

type NewInvoiceInput = Omit<Invoice, 'id' | 'invoiceNo' | 'status' | 'paid'> & { lines: InvoiceLine[] };
type NewBillInput = Omit<SupplierBill, 'id' | 'billNo' | 'status' | 'paid' | 'poMatch' | 'grnMatch' | 'invoiceMatch' | 'difference'>;
type NewPaymentInput = Omit<Payment, 'id' | 'paymentNo' | 'remainingBalance' | 'status'>;
type NewJournalInput = Omit<JournalEntry, 'id' | 'journalNo' | 'status'>;

interface FinanceContextValue {
  invoices: Invoice[];
  supplierBills: SupplierBill[];
  payments: Payment[];
  journalEntries: JournalEntry[];
  chartOfAccounts: Account[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  addInvoice: (input: NewInvoiceInput, send: boolean) => string;
  addBill: (input: NewBillInput) => string;
  approveBill: (id: string) => void;
  addPayment: (input: NewPaymentInput) => string;
  addJournalEntry: (input: NewJournalInput) => string;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

let invoiceSeq = seedInvoices.length;
let billSeq = seedBills.length;
let paymentSeq = seedPayments.length;
let journalSeq = seedJournalEntries.length;
let bankTxnSeq = seedBankTransactions.length;

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

  const addInvoice: FinanceContextValue['addInvoice'] = (input, send) => {
    invoiceSeq += 1;
    const id = `INV-${String(invoiceSeq).padStart(3, '0')}`;
    const invoiceNo = `INV-2026-10${43 + (invoiceSeq - seedInvoices.length)}`;
    const invoice: Invoice = { ...input, id, invoiceNo, status: send ? 'Sent' : 'Draft', paid: 0 };
    setInvoices((prev) => [invoice, ...prev]);
    return id;
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
    };
    setSupplierBills((prev) => [bill, ...prev]);
    return id;
  };

  const approveBill: FinanceContextValue['approveBill'] = (id) => {
    setSupplierBills((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'Approved' } : b)));
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
          return { ...inv, paid, status: paid >= inv.amount ? 'Paid' : 'Partially Paid' };
        }),
      );
    } else if (input.type === 'Supplier Payment') {
      setSupplierBills((prev) =>
        prev.map((bill) => {
          if (bill.billNo !== input.invoiceOrBillRef) return bill;
          const paid = bill.paid + input.amount;
          return { ...bill, paid, status: paid >= bill.amount ? 'Paid' : 'Partially Paid' };
        }),
      );
    }

    // Record the cash movement against the selected bank account.
    const inflow = input.type === 'Customer Payment' || input.type === 'Advance Payment';
    const outflow = input.type === 'Supplier Payment' || input.type === 'Refund';
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
    return id;
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
        addInvoice,
        addBill,
        approveBill,
        addPayment,
        addJournalEntry,
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
