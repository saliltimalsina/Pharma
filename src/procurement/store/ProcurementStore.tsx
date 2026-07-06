import { createContext, useContext, useState, ReactNode } from 'react';
import {
  requisitions as seedRequisitions,
  vendors as seedVendors,
  rfqs as seedRfqs,
  purchaseOrders as seedPurchaseOrders,
  grns as seedGrns,
} from '../data/mockData';
import type {
  Requisition,
  Vendor,
  Rfq,
  RfqQuote,
  PurchaseOrder,
  Grn,
} from '../data/types';

type NewVendorInput = Omit<Vendor, 'id' | 'vendorCode' | 'outstandingBalance'>;

type NewRequisitionInput = Omit<Requisition, 'id' | 'requestNo' | 'status'>;
type NewRfqInput = Omit<Rfq, 'id' | 'rfqNo' | 'status' | 'quotes' | 'awardedVendor'> & {
  quotes?: RfqQuote[];
};
type NewPoInput = Omit<PurchaseOrder, 'id' | 'poNumber' | 'status'>;
type NewGrnInput = Omit<Grn, 'id' | 'grnNumber' | 'status'>;

interface ProcurementContextValue {
  requisitions: Requisition[];
  vendors: Vendor[];
  rfqs: Rfq[];
  purchaseOrders: PurchaseOrder[];
  grns: Grn[];
  addRequisition: (input: NewRequisitionInput, submit: boolean) => string;
  submitRequisition: (id: string) => void;
  approveRequisition: (id: string, approver: string) => void;
  rejectRequisition: (id: string, approver: string, reason: string) => void;
  completeRequisition: (id: string) => void;
  addVendor: (input: NewVendorInput) => string;
  addRfq: (input: NewRfqInput, send: boolean) => string;
  awardRfq: (id: string, vendorId: string) => void;
  addPurchaseOrder: (input: NewPoInput, submit: boolean) => string;
  approvePurchaseOrder: (id: string) => void;
  sendPurchaseOrder: (id: string) => void;
  addGrn: (input: NewGrnInput, complete: boolean) => string;
  acceptGrn: (id: string) => void;
}

const ProcurementContext = createContext<ProcurementContextValue | null>(null);

let requisitionSeq = seedRequisitions.length;
let vendorSeq = seedVendors.length;
let rfqSeq = seedRfqs.length;
let poSeq = seedPurchaseOrders.length;
let grnSeq = seedGrns.length;

export function ProcurementProvider({ children }: { children: ReactNode }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>(seedRequisitions);
  const [vendors, setVendors] = useState<Vendor[]>(seedVendors);
  const [rfqs, setRfqs] = useState<Rfq[]>(seedRfqs);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(seedPurchaseOrders);
  const [grns, setGrns] = useState<Grn[]>(seedGrns);

  const addRequisition: ProcurementContextValue['addRequisition'] = (input, submit) => {
    requisitionSeq += 1;
    const id = `REQ-${String(requisitionSeq).padStart(3, '0')}`;
    const requestNo = `REQ-2026-0${142 + (requisitionSeq - seedRequisitions.length)}`;
    const requisition: Requisition = {
      ...input,
      id,
      requestNo,
      status: submit ? 'Pending Approval' : 'Draft',
    };
    setRequisitions((prev) => [requisition, ...prev]);
    return id;
  };

  const submitRequisition: ProcurementContextValue['submitRequisition'] = (id) => {
    setRequisitions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Pending Approval' } : r)),
    );
  };

  const approveRequisition: ProcurementContextValue['approveRequisition'] = (id, approver) => {
    setRequisitions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Approved', approvedBy: approver } : r)),
    );
  };

  const rejectRequisition: ProcurementContextValue['rejectRequisition'] = (id, approver, reason) => {
    setRequisitions((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'Rejected', approvedBy: approver, notes: reason } : r,
      ),
    );
  };

  const completeRequisition: ProcurementContextValue['completeRequisition'] = (id) => {
    setRequisitions((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Completed' } : r)));
  };

  const addVendor: ProcurementContextValue['addVendor'] = (input) => {
    vendorSeq += 1;
    const id = `V-${String(vendorSeq).padStart(3, '0')}`;
    const vendor: Vendor = {
      ...input,
      id,
      vendorCode: `VEN-${1000 + vendorSeq}`,
      outstandingBalance: 0,
    };
    setVendors((prev) => [vendor, ...prev]);
    return id;
  };

  const addRfq: ProcurementContextValue['addRfq'] = (input, send) => {
    rfqSeq += 1;
    const id = `RFQ-${String(rfqSeq).padStart(3, '0')}`;
    const rfqNo = `RFQ-2026-00${31 + (rfqSeq - seedRfqs.length)}`;
    const rfq: Rfq = {
      ...input,
      id,
      rfqNo,
      status: send ? 'Sent' : 'Draft',
      quotes: input.quotes ?? [],
    };
    setRfqs((prev) => [rfq, ...prev]);
    return id;
  };

  const awardRfq: ProcurementContextValue['awardRfq'] = (id, vendorId) => {
    setRfqs((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Awarded', awardedVendor: vendorId } : r)),
    );
  };

  const addPurchaseOrder: ProcurementContextValue['addPurchaseOrder'] = (input, submit) => {
    poSeq += 1;
    const id = `PO-${String(poSeq).padStart(3, '0')}`;
    const poNumber = `PO-2026-0${512 + (poSeq - seedPurchaseOrders.length)}`;
    const po: PurchaseOrder = {
      ...input,
      id,
      poNumber,
      status: submit ? 'Pending Approval' : 'Draft',
      items: input.items.map((it) => ({ ...it, receivedQty: it.receivedQty ?? 0 })),
    };
    setPurchaseOrders((prev) => [po, ...prev]);
    return id;
  };

  const approvePurchaseOrder: ProcurementContextValue['approvePurchaseOrder'] = (id) => {
    setPurchaseOrders((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'Approved' } : p)));
  };

  const sendPurchaseOrder: ProcurementContextValue['sendPurchaseOrder'] = (id) => {
    setPurchaseOrders((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'Sent' } : p)));
  };

  // Persist a GRN, then roll its accepted quantities back onto the matching PO
  // and advance the PO status (Partially Received / Completed).
  const addGrn: ProcurementContextValue['addGrn'] = (input, complete) => {
    grnSeq += 1;
    const id = `GRN-${String(grnSeq).padStart(3, '0')}`;
    const grnNumber = `GRN-2026-0${311 + (grnSeq - seedGrns.length)}`;
    const grn: Grn = {
      ...input,
      id,
      grnNumber,
      status: complete ? 'Completed' : 'Pending',
    };
    setGrns((prev) => [grn, ...prev]);
    if (complete) applyGrnToPo(grn);
    return id;
  };

  const acceptGrn: ProcurementContextValue['acceptGrn'] = (id) => {
    const grn = grns.find((g) => g.id === id);
    setGrns((prev) => prev.map((g) => (g.id === id ? { ...g, status: 'Completed' } : g)));
    if (grn) applyGrnToPo({ ...grn, status: 'Completed' });
  };

  function applyGrnToPo(grn: Grn) {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.poNumber !== grn.poNumber) return po;
        const items = po.items.map((it) => {
          const line = grn.items.find((g) => g.product === it.product);
          if (!line) return it;
          return { ...it, receivedQty: (it.receivedQty ?? 0) + line.acceptedQty };
        });
        const fullyReceived = items.every((it) => (it.receivedQty ?? 0) >= it.qty);
        return { ...po, items, status: fullyReceived ? 'Completed' : 'Partially Received' };
      }),
    );
  }

  return (
    <ProcurementContext.Provider
      value={{
        requisitions,
        vendors,
        rfqs,
        purchaseOrders,
        grns,
        addRequisition,
        submitRequisition,
        approveRequisition,
        rejectRequisition,
        completeRequisition,
        addVendor,
        addRfq,
        awardRfq,
        addPurchaseOrder,
        approvePurchaseOrder,
        sendPurchaseOrder,
        addGrn,
        acceptGrn,
      }}
    >
      {children}
    </ProcurementContext.Provider>
  );
}

export function useProcurement() {
  const ctx = useContext(ProcurementContext);
  if (!ctx) throw new Error('useProcurement must be used within ProcurementProvider');
  return ctx;
}
