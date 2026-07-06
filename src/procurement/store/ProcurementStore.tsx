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
  VendorDoc,
  Rfq,
  RfqQuote,
  PurchaseOrder,
  PoItem,
  PoAmendment,
  Grn,
  ProcurementEvent,
  ProcurementEventType,
  ProcurementEntity,
} from '../data/types';

type NewVendorInput = Omit<Vendor, 'id' | 'vendorCode' | 'outstandingBalance'>;

type NewRequisitionInput = Omit<Requisition, 'id' | 'requestNo' | 'status'>;
type NewRfqInput = Omit<Rfq, 'id' | 'rfqNo' | 'status' | 'quotes' | 'awardedVendor'> & {
  quotes?: RfqQuote[];
};
type NewPoInput = Omit<PurchaseOrder, 'id' | 'poNumber' | 'status'>;
type NewGrnInput = Omit<Grn, 'id' | 'grnNumber' | 'status'>;

// A quote as entered by a user on RFQDetail; score/submitted are derived by the store.
type QuoteInput = Pick<
  RfqQuote,
  'vendorId' | 'vendorName' | 'price' | 'deliveryDays' | 'paymentTerms' | 'qualityRating'
>;

interface ProcurementContextValue {
  requisitions: Requisition[];
  vendors: Vendor[];
  rfqs: Rfq[];
  purchaseOrders: PurchaseOrder[];
  grns: Grn[];
  procurementEvents: ProcurementEvent[];
  addRequisition: (input: NewRequisitionInput, submit: boolean) => string;
  submitRequisition: (id: string) => void;
  approveRequisition: (id: string, approver: string) => void;
  rejectRequisition: (id: string, approver: string, reason: string) => void;
  completeRequisition: (id: string) => void;
  addVendor: (input: NewVendorInput) => string;
  addVendorDoc: (vendorId: string, doc: VendorDoc) => void;
  removeVendorDoc: (vendorId: string, index: number) => void;
  addRfq: (input: NewRfqInput, send: boolean) => string;
  submitQuote: (rfqId: string, quote: QuoteInput) => void;
  awardRfq: (id: string, vendorId: string) => void;
  addPurchaseOrder: (input: NewPoInput, submit: boolean) => string;
  approvePurchaseOrder: (id: string) => void;
  sendPurchaseOrder: (id: string) => void;
  amendPurchaseOrder: (id: string, updatedItems: PoItem[], note: string) => void;
  addGrn: (input: NewGrnInput, complete: boolean) => string;
  acceptGrn: (id: string) => void;
}

const ProcurementContext = createContext<ProcurementContextValue | null>(null);

// Actor used for audit events that carry no explicit user (approvals, sends, etc.).
const SYSTEM_ACTOR = 'Procurement Officer';

let requisitionSeq = seedRequisitions.length;
let vendorSeq = seedVendors.length;
let rfqSeq = seedRfqs.length;
let poSeq = seedPurchaseOrders.length;
let grnSeq = seedGrns.length;
let eventSeq = 0;

// Amount = Σ line totals (base − discount + VAT), matching POForm's grand-total math.
function poAmount(items: PoItem[]): number {
  return items.reduce((sum, it) => {
    const base = it.qty * it.unitPrice;
    const discounted = base - (base * it.discount) / 100;
    return sum + discounted + (discounted * it.vat) / 100;
  }, 0);
}

// Recompute every submitted quote's score from the REAL entered values, normalised
// within the RFQ: best price -> 1, fastest delivery -> 1, quality rating / 5.
function recomputeScores(quotes: RfqQuote[]): RfqQuote[] {
  const submitted = quotes.filter((q) => q.submitted);
  if (submitted.length === 0) return quotes;
  const prices = submitted.map((q) => q.price);
  const deliveries = submitted.map((q) => q.deliveryDays);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const minD = Math.min(...deliveries);
  const maxD = Math.max(...deliveries);
  const norm = (v: number, min: number, max: number) => (max === min ? 1 : (max - v) / (max - min));
  return quotes.map((q) => {
    if (!q.submitted) return { ...q, score: 0 };
    const priceScore = norm(q.price, minP, maxP);
    const deliveryScore = norm(q.deliveryDays, minD, maxD);
    const qualityScore = Math.max(0, Math.min(1, q.qualityRating / 5));
    const score = Math.round((0.4 * priceScore + 0.3 * deliveryScore + 0.3 * qualityScore) * 100);
    return { ...q, score };
  });
}

export function ProcurementProvider({ children }: { children: ReactNode }) {
  const [requisitions, setRequisitions] = useState<Requisition[]>(seedRequisitions);
  const [vendors, setVendors] = useState<Vendor[]>(seedVendors);
  const [rfqs, setRfqs] = useState<Rfq[]>(seedRfqs);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(seedPurchaseOrders);
  const [grns, setGrns] = useState<Grn[]>(seedGrns);
  const [procurementEvents, setProcurementEvents] = useState<ProcurementEvent[]>([]);

  // Append an audit-trail entry. In-memory only (resets on refresh).
  const logEvent = (
    type: ProcurementEventType,
    entity: ProcurementEntity,
    ref: string,
    by: string,
  ) => {
    eventSeq += 1;
    const event: ProcurementEvent = {
      id: `EVT-${String(eventSeq).padStart(4, '0')}`,
      date: new Date().toISOString(),
      type,
      entity,
      ref,
      by,
    };
    setProcurementEvents((prev) => [event, ...prev]);
  };

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
    logEvent(submit ? 'Submitted' : 'Created', 'Requisition', requestNo, input.requestedBy);
    return id;
  };

  const submitRequisition: ProcurementContextValue['submitRequisition'] = (id) => {
    const req = requisitions.find((r) => r.id === id);
    setRequisitions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Pending Approval' } : r)),
    );
    if (req) logEvent('Submitted', 'Requisition', req.requestNo, req.requestedBy);
  };

  const approveRequisition: ProcurementContextValue['approveRequisition'] = (id, approver) => {
    const req = requisitions.find((r) => r.id === id);
    setRequisitions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Approved', approvedBy: approver } : r)),
    );
    if (req) logEvent('Approved', 'Requisition', req.requestNo, approver);
  };

  const rejectRequisition: ProcurementContextValue['rejectRequisition'] = (id, approver, reason) => {
    const req = requisitions.find((r) => r.id === id);
    setRequisitions((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'Rejected', approvedBy: approver, notes: reason } : r,
      ),
    );
    if (req) logEvent('Rejected', 'Requisition', req.requestNo, approver);
  };

  const completeRequisition: ProcurementContextValue['completeRequisition'] = (id) => {
    const req = requisitions.find((r) => r.id === id);
    setRequisitions((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Completed' } : r)));
    if (req) logEvent('Completed', 'Requisition', req.requestNo, SYSTEM_ACTOR);
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
    logEvent('Created', 'Vendor', vendor.name, SYSTEM_ACTOR);
    return id;
  };

  const addVendorDoc: ProcurementContextValue['addVendorDoc'] = (vendorId, doc) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    setVendors((prev) =>
      prev.map((v) => (v.id === vendorId ? { ...v, documents: [...v.documents, doc] } : v)),
    );
    if (vendor) logEvent('Document Added', 'Vendor', `${vendor.name} · ${doc.name}`, SYSTEM_ACTOR);
  };

  const removeVendorDoc: ProcurementContextValue['removeVendorDoc'] = (vendorId, index) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    const docName = vendor?.documents[index]?.name ?? '';
    setVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId ? { ...v, documents: v.documents.filter((_, i) => i !== index) } : v,
      ),
    );
    if (vendor) logEvent('Document Removed', 'Vendor', `${vendor.name} · ${docName}`, SYSTEM_ACTOR);
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
    logEvent(send ? 'Sent' : 'Created', 'RFQ', rfqNo, SYSTEM_ACTOR);
    return id;
  };

  // Upsert a vendor's quote from real entered values, then re-score the whole RFQ.
  const submitQuote: ProcurementContextValue['submitQuote'] = (rfqId, quote) => {
    const rfq = rfqs.find((r) => r.id === rfqId);
    setRfqs((prev) =>
      prev.map((r) => {
        if (r.id !== rfqId) return r;
        const existing = r.quotes.filter((q) => q.vendorId !== quote.vendorId);
        const nextQuotes = recomputeScores([
          ...existing,
          { ...quote, score: 0, submitted: true },
        ]);
        const status = r.status === 'Sent' || r.status === 'Draft' ? 'Receiving Quotes' : r.status;
        return { ...r, quotes: nextQuotes, status };
      }),
    );
    if (rfq) logEvent('Quote Submitted', 'RFQ', rfq.rfqNo, quote.vendorName);
  };

  const awardRfq: ProcurementContextValue['awardRfq'] = (id, vendorId) => {
    const rfq = rfqs.find((r) => r.id === id);
    setRfqs((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Awarded', awardedVendor: vendorId } : r)),
    );
    if (rfq) {
      const vendorName = vendors.find((v) => v.id === vendorId)?.name ?? vendorId;
      logEvent('Awarded', 'RFQ', `${rfq.rfqNo} → ${vendorName}`, SYSTEM_ACTOR);
    }
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
    logEvent(submit ? 'Submitted' : 'Created', 'Purchase Order', poNumber, input.createdBy);
    return id;
  };

  const approvePurchaseOrder: ProcurementContextValue['approvePurchaseOrder'] = (id) => {
    const po = purchaseOrders.find((p) => p.id === id);
    setPurchaseOrders((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'Approved' } : p)));
    if (po) logEvent('Approved', 'Purchase Order', po.poNumber, SYSTEM_ACTOR);
  };

  const sendPurchaseOrder: ProcurementContextValue['sendPurchaseOrder'] = (id) => {
    const po = purchaseOrders.find((p) => p.id === id);
    setPurchaseOrders((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'Sent' } : p)));
    if (po) logEvent('Sent', 'Purchase Order', po.poNumber, SYSTEM_ACTOR);
  };

  // Amend line quantities/prices while a PO is still Draft or Pending Approval.
  // Recomputes amount and records the change on the PO's amendment trail.
  const amendPurchaseOrder: ProcurementContextValue['amendPurchaseOrder'] = (
    id,
    updatedItems,
    note,
  ) => {
    const po = purchaseOrders.find((p) => p.id === id);
    setPurchaseOrders((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.status !== 'Draft' && p.status !== 'Pending Approval') return p;
        const amendment: PoAmendment = {
          date: new Date().toISOString(),
          note,
          changedBy: p.createdBy,
        };
        return {
          ...p,
          items: updatedItems,
          amount: poAmount(updatedItems),
          amendments: [...(p.amendments ?? []), amendment],
        };
      }),
    );
    if (po && (po.status === 'Draft' || po.status === 'Pending Approval')) {
      logEvent('Amended', 'Purchase Order', po.poNumber, po.createdBy);
    }
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
    logEvent(complete ? 'Received' : 'Created', 'GRN', grnNumber, input.receivedBy);
    return id;
  };

  const acceptGrn: ProcurementContextValue['acceptGrn'] = (id) => {
    const grn = grns.find((g) => g.id === id);
    setGrns((prev) => prev.map((g) => (g.id === id ? { ...g, status: 'Completed' } : g)));
    if (grn) {
      applyGrnToPo({ ...grn, status: 'Completed' });
      logEvent('Received', 'GRN', grn.grnNumber, grn.receivedBy);
    }
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
        procurementEvents,
        addRequisition,
        submitRequisition,
        approveRequisition,
        rejectRequisition,
        completeRequisition,
        addVendor,
        addVendorDoc,
        removeVendorDoc,
        addRfq,
        submitQuote,
        awardRfq,
        addPurchaseOrder,
        approvePurchaseOrder,
        sendPurchaseOrder,
        amendPurchaseOrder,
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
