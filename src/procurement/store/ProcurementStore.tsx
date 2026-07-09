import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import {
  requisitions as seedRequisitions,
  vendors as seedVendors,
  rfqs as seedRfqs,
  purchaseOrders as seedPurchaseOrders,
  grns as seedGrns,
} from '../data/mockData';
import { fetchVendors, fetchVendorCategories, fetchBusinessTypes, createVendor } from './vendorApi';
import {
  fetchRequisitions,
  fetchDepartments,
  createRequisition,
  approveRequisitionApi,
  rejectRequisitionApi,
  type CreateRequisitionInput,
} from './requisitionApi';
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
  addRequisition: (input: NewRequisitionInput, submit: boolean) => Promise<string>;
  submitRequisition: (id: string) => void;
  approveRequisition: (id: string, approver: string) => Promise<void>;
  rejectRequisition: (id: string, approver: string, reason: string) => Promise<void>;
  completeRequisition: (id: string) => void;
  addVendor: (input: NewVendorInput) => Promise<string>;
  addVendorDoc: (vendorId: string, doc: VendorDoc) => void;
  removeVendorDoc: (vendorId: string, index: number) => void;
  addRfq: (input: NewRfqInput, send: boolean) => string;
  submitQuote: (rfqId: string, quote: QuoteInput) => void;
  awardRfq: (id: string, vendorId: string) => void;
  addPurchaseOrder: (input: NewPoInput, submit: boolean) => string;
  approvePurchaseOrder: (id: string) => void;
  sendPurchaseOrder: (id: string) => void;
  amendPurchaseOrder: (id: string, updatedItems: PoItem[], note: string) => void;
  addGrn: (input: NewGrnInput, complete: boolean) => Grn;
  acceptGrn: (id: string) => void;
}

const ProcurementContext = createContext<ProcurementContextValue | null>(null);

// Actor used for audit events that carry no explicit user (approvals, sends, etc.).
const SYSTEM_ACTOR = 'Procurement Officer';

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

  // Vendors are backed by the real API; category/business-type name -> id
  // lookups are cached here for addVendor (the form only knows names).
  // Cached as pending promises rather than plain maps so a submit that
  // races the initial fetch awaits the same in-flight request instead of
  // reading an empty map.
  const categoryIdsPromise = useRef<Promise<Map<string, number>> | null>(null);
  const businessTypeIdsPromise = useRef<Promise<Map<string, number>> | null>(null);
  const departmentIdsPromise = useRef<Promise<Map<string, number>> | null>(null);

  const loadCategoryIds = () => {
    if (!categoryIdsPromise.current) {
      categoryIdsPromise.current = fetchVendorCategories().then(
        (rows) => new Map(rows.map((r) => [r.name, r.id])),
      );
    }
    return categoryIdsPromise.current;
  };

  const loadBusinessTypeIds = () => {
    if (!businessTypeIdsPromise.current) {
      businessTypeIdsPromise.current = fetchBusinessTypes().then(
        (rows) => new Map(rows.map((r) => [r.name, r.id])),
      );
    }
    return businessTypeIdsPromise.current;
  };

  const loadDepartmentIds = () => {
    if (!departmentIdsPromise.current) {
      departmentIdsPromise.current = fetchDepartments().then(
        (rows) => new Map(rows.map((r) => [r.name, r.id])),
      );
    }
    return departmentIdsPromise.current;
  };

  useEffect(() => {
    fetchVendors()
      .then(setVendors)
      .catch((e) => console.error('Failed to load vendors', e));
    loadCategoryIds().catch((e) => console.error('Failed to load vendor categories', e));
    loadBusinessTypeIds().catch((e) => console.error('Failed to load business types', e));
    fetchRequisitions()
      .then(setRequisitions)
      .catch((e) => console.error('Failed to load requisitions', e));
    loadDepartmentIds().catch((e) => console.error('Failed to load departments', e));
  }, []);

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

  const PRIORITY_VALUE: Record<Requisition['priority'], CreateRequisitionInput['priority']> = {
    Low: 'low',
    Medium: 'medium',
    High: 'high',
    Urgent: 'urgent',
  };

  // Items come from the form with `item` holding the selected raw_material_id
  // (a real select now, sourced from the live Item catalog - not free text).
  const addRequisition: ProcurementContextValue['addRequisition'] = async (input, submit) => {
    const departmentIds = await loadDepartmentIds();
    const requisition = await createRequisition({
      departmentId: departmentIds.get(input.department) ?? 0,
      requiredByDate: input.requiredDate || undefined,
      priority: PRIORITY_VALUE[input.priority],
      purposeRemarks: input.notes ? `${input.purpose}\n\n${input.notes}` : input.purpose,
      submit,
      items: input.items.map((it) => ({
        rawMaterialId: it.item,
        quantityRequested: it.requiredQty,
        unit: it.unit,
      })),
    });
    setRequisitions((prev) => [requisition, ...prev]);
    logEvent(submit ? 'Submitted' : 'Created', 'Requisition', requisition.requestNo, input.requestedBy);
    return requisition.id;
  };

  // No backend endpoint exists yet to submit an already-created draft
  // (only create-time submit and approve/reject) - local-only for now.
  const submitRequisition: ProcurementContextValue['submitRequisition'] = (id) => {
    const req = requisitions.find((r) => r.id === id);
    setRequisitions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Pending Approval' } : r)),
    );
    if (req) logEvent('Submitted', 'Requisition', req.requestNo, req.requestedBy);
  };

  const approveRequisition: ProcurementContextValue['approveRequisition'] = async (id, approver) => {
    const updated = await approveRequisitionApi(id);
    setRequisitions((prev) => prev.map((r) => (r.id === id ? updated : r)));
    logEvent('Approved', 'Requisition', updated.requestNo, approver);
  };

  const rejectRequisition: ProcurementContextValue['rejectRequisition'] = async (id, approver, reason) => {
    const updated = await rejectRequisitionApi(id, reason);
    setRequisitions((prev) => prev.map((r) => (r.id === id ? { ...updated, notes: reason } : r)));
    logEvent('Rejected', 'Requisition', updated.requestNo, approver);
  };

  const completeRequisition: ProcurementContextValue['completeRequisition'] = (id) => {
    const req = requisitions.find((r) => r.id === id);
    setRequisitions((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Completed' } : r)));
    if (req) logEvent('Completed', 'Requisition', req.requestNo, SYSTEM_ACTOR);
  };

  const addVendor: ProcurementContextValue['addVendor'] = async (input) => {
    const [categoryIds, businessTypeIds] = await Promise.all([loadCategoryIds(), loadBusinessTypeIds()]);
    const vendor = await createVendor({
      name: input.name,
      vendorCategoryId: categoryIds.get(input.category) ?? 0,
      businessTypeId: businessTypeIds.get(input.businessType),
      phone: input.phone,
      email: input.email,
      website: input.website,
      address: input.address,
      country: input.country,
      registrationNumber: input.registrationNumber,
      vatNumber: input.vatNumber,
      establishedDate: input.establishedDate || undefined,
      primaryContact: input.primaryContact,
      paymentTerms: input.paymentTerms,
      currency: input.currency,
      creditLimit: input.creditLimit,
    });
    setVendors((prev) => [vendor, ...prev]);
    logEvent('Created', 'Vendor', vendor.name, SYSTEM_ACTOR);
    return vendor.id;
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
    return grn;
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
