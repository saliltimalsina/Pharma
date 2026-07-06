import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import {
  items as seedItems,
  transfers as seedTransfers,
  adjustments as seedAdjustments,
  batches as seedBatches,
} from '../data/mockData';
import type {
  Item,
  Transfer,
  Adjustment,
  TransferItem,
  AdjustmentItem,
  Batch,
  StockEntry,
  BatchStatus,
} from '../data/types';

type NewItemInput = Omit<Item, 'id' | 'sku' | 'status'>;
type NewTransferInput = Omit<Transfer, 'id' | 'transferNumber' | 'status'> & { items: TransferItem[] };
type NewAdjustmentInput = Omit<Adjustment, 'id' | 'adjustmentNo' | 'status' | 'approver'> & {
  items: AdjustmentItem[];
};
type NewBatchInput = Omit<Batch, 'id'>;

// One receiving line — used by manual Stock-In and by the GRN → stock cascade.
export interface StockInLine {
  itemId: string;
  batchNumber: string;
  warehouseId: string;
  quantity: number;
  expiryDate: string;
  manufacturingDate?: string;
  supplierName: string;
  poNumber: string;
  grnNumber: string;
  shelfLifeMonths?: number;
  countryOfOrigin?: string;
  qcStatus?: BatchStatus;
}

interface InventoryContextValue {
  items: Item[];
  transfers: Transfer[];
  adjustments: Adjustment[];
  batches: Batch[];
  stockEntries: StockEntry[];
  addItem: (input: NewItemInput) => string;
  addBatch: (input: NewBatchInput) => string;
  // Create or top-up batches from a receipt (Stock-In / GRN). Returns affected batch ids.
  receiveStock: (lines: StockInLine[]) => string[];
  addTransfer: (input: NewTransferInput, submit: boolean) => string;
  approveTransfer: (id: string) => void;
  completeTransfer: (id: string) => void;
  cancelTransfer: (id: string) => void;
  addAdjustment: (input: NewAdjustmentInput) => string;
  approveAdjustment: (id: string, approver: string) => void;
  rejectAdjustment: (id: string, approver: string) => void;
  reserveStock: (batchId: string, qty: number) => void;
  releaseReservation: (batchId: string, qty: number) => void;
  returnStock: (batchId: string, qty: number) => void;
  recallBatch: (batchId: string) => void;
  disposeBatch: (batchId: string) => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

let itemSeq = seedItems.length;
let transferSeq = seedTransfers.length;
let adjustmentSeq = seedAdjustments.length;
let batchSeq = seedBatches.length;

// Derived stock-entry view over batches (mirrors the original mockData derivation so
// bins / STK-ids stay stable as long as batch ordering is append-only).
function deriveStockEntries(batches: Batch[]): StockEntry[] {
  return batches.map((b, i) => ({
    id: `STK-${String(i + 1).padStart(3, '0')}`,
    itemId: b.itemId,
    batchNumber: b.batchNumber,
    warehouseId: b.warehouseId,
    bin: `${b.warehouseId.replace('WH-', 'WH')}-A${(i % 5) + 1}-R${(i % 3) + 1}-S${(i % 4) + 1}`,
    availableQty: b.availableQty,
    reservedQty: b.reservedQty,
    damagedQty: b.damagedQty,
    pendingInspectionQty:
      b.qcStatus === 'Under Inspection' ? b.receivedQty - b.availableQty - b.reservedQty : 0,
    expiryDate: b.expiryDate,
    supplierName: b.supplierName,
    poNumber: b.poNumber,
    grnNumber: b.grnNumber,
  }));
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>(seedItems);
  const [transfers, setTransfers] = useState<Transfer[]>(seedTransfers);
  const [adjustments, setAdjustments] = useState<Adjustment[]>(seedAdjustments);
  const [batches, setBatches] = useState<Batch[]>(seedBatches);

  const stockEntries = useMemo(() => deriveStockEntries(batches), [batches]);

  const addItem: InventoryContextValue['addItem'] = (input) => {
    itemSeq += 1;
    const id = `ITM-${String(itemSeq).padStart(3, '0')}`;
    const prefix = input.category.slice(0, 3).toUpperCase();
    const item: Item = { ...input, id, sku: `${prefix}-${100 + itemSeq}`, status: 'Active' };
    setItems((prev) => [item, ...prev]);
    return id;
  };

  const addBatch: InventoryContextValue['addBatch'] = (input) => {
    batchSeq += 1;
    const id = `BATCH-${String(batchSeq).padStart(3, '0')}`;
    const batch: Batch = { ...input, id };
    setBatches((prev) => [...prev, batch]);
    return id;
  };

  const receiveStock: InventoryContextValue['receiveStock'] = (lines) => {
    const affected: string[] = [];
    const next = [...batches];
    for (const line of lines) {
      if (line.quantity <= 0) continue;
      const idx = next.findIndex(
        (b) => b.batchNumber === line.batchNumber && b.warehouseId === line.warehouseId,
      );
      if (idx >= 0) {
        const b = next[idx];
        next[idx] = {
          ...b,
          receivedQty: b.receivedQty + line.quantity,
          availableQty: b.availableQty + line.quantity,
        };
        affected.push(b.id);
      } else {
        batchSeq += 1;
        const id = `BATCH-${String(batchSeq).padStart(3, '0')}`;
        const qc: BatchStatus = line.qcStatus ?? 'Under Inspection';
        next.push({
          id,
          batchNumber: line.batchNumber,
          itemId: line.itemId,
          supplierName: line.supplierName,
          poNumber: line.poNumber,
          grnNumber: line.grnNumber,
          warehouseId: line.warehouseId,
          manufacturingDate: line.manufacturingDate ?? '',
          expiryDate: line.expiryDate,
          shelfLifeMonths: line.shelfLifeMonths ?? 0,
          countryOfOrigin: line.countryOfOrigin ?? '',
          qcStatus: qc,
          inspectionResult: qc === 'Released' ? 'Pass' : 'Pending',
          approvedBy: '',
          releasedDate: '',
          receivedQty: line.quantity,
          // Goods under inspection are not yet available; released goods are.
          availableQty: qc === 'Released' || qc === 'Available' ? line.quantity : 0,
          reservedQty: 0,
          damagedQty: 0,
          returnedQty: 0,
        });
        affected.push(id);
      }
    }
    setBatches(next);
    return affected;
  };

  const addTransfer: InventoryContextValue['addTransfer'] = (input, submit) => {
    transferSeq += 1;
    const id = `TRF-${String(transferSeq).padStart(3, '0')}`;
    const transferNumber = `TRF-2026-00${42 + (transferSeq - seedTransfers.length)}`;
    const transfer: Transfer = {
      ...input,
      id,
      transferNumber,
      status: submit ? 'Pending Approval' : 'Draft',
    };
    setTransfers((prev) => [transfer, ...prev]);
    return id;
  };

  const approveTransfer: InventoryContextValue['approveTransfer'] = (id) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'In Transit' } : t)));
  };

  // Completing a transfer actually moves quantity: decrement the source-warehouse batch,
  // create/increment a same-numbered batch in the destination warehouse.
  const completeTransfer: InventoryContextValue['completeTransfer'] = (id) => {
    const transfer = transfers.find((t) => t.id === id);
    if (!transfer) return;
    let next = [...batches];
    for (const line of transfer.items) {
      if (line.quantity <= 0) continue;
      const srcIdx = next.findIndex(
        (b) => b.batchNumber === line.batchNumber && b.warehouseId === transfer.fromWarehouseId,
      );
      if (srcIdx < 0) continue;
      const src = next[srcIdx];
      const moveQty = Math.min(line.quantity, src.availableQty);
      next[srcIdx] = { ...src, availableQty: src.availableQty - moveQty };
      const dstIdx = next.findIndex(
        (b) => b.batchNumber === line.batchNumber && b.warehouseId === transfer.toWarehouseId,
      );
      if (dstIdx >= 0) {
        const dst = next[dstIdx];
        next[dstIdx] = { ...dst, availableQty: dst.availableQty + moveQty, receivedQty: dst.receivedQty + moveQty };
      } else {
        batchSeq += 1;
        next = [
          ...next,
          {
            ...src,
            id: `BATCH-${String(batchSeq).padStart(3, '0')}`,
            warehouseId: transfer.toWarehouseId,
            receivedQty: moveQty,
            availableQty: moveQty,
            reservedQty: 0,
            damagedQty: 0,
            returnedQty: 0,
          },
        ];
      }
    }
    setBatches(next);
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Completed' } : t)));
  };

  const cancelTransfer: InventoryContextValue['cancelTransfer'] = (id) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Cancelled' } : t)));
  };

  const addAdjustment: InventoryContextValue['addAdjustment'] = (input) => {
    adjustmentSeq += 1;
    const id = `ADJ-${String(adjustmentSeq).padStart(3, '0')}`;
    const adjustmentNo = `ADJ-2026-00${18 + (adjustmentSeq - seedAdjustments.length)}`;
    const adjustment: Adjustment = {
      ...input,
      id,
      adjustmentNo,
      status: 'Pending Approval',
      approver: '',
    };
    setAdjustments((prev) => [adjustment, ...prev]);
    return id;
  };

  // Approving an adjustment reconciles system stock to the counted actual quantity.
  const approveAdjustment: InventoryContextValue['approveAdjustment'] = (id, approver) => {
    const adjustment = adjustments.find((a) => a.id === id);
    if (adjustment) {
      setBatches((prev) => {
        const next = [...prev];
        for (const line of adjustment.items) {
          const idx = next.findIndex(
            (b) => b.batchNumber === line.batchNumber && b.warehouseId === adjustment.warehouseId,
          );
          if (idx < 0) continue;
          const b = next[idx];
          const delta = line.actualQty - line.currentQty;
          next[idx] = { ...b, availableQty: Math.max(0, b.availableQty + delta) };
        }
        return next;
      });
    }
    setAdjustments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'Approved', approver } : a)),
    );
  };

  const rejectAdjustment: InventoryContextValue['rejectAdjustment'] = (id, approver) => {
    setAdjustments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'Rejected', approver } : a)),
    );
  };

  const reserveStock: InventoryContextValue['reserveStock'] = (batchId, qty) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        const move = Math.min(qty, b.availableQty);
        return { ...b, availableQty: b.availableQty - move, reservedQty: b.reservedQty + move };
      }),
    );
  };

  const releaseReservation: InventoryContextValue['releaseReservation'] = (batchId, qty) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        const move = Math.min(qty, b.reservedQty);
        return { ...b, reservedQty: b.reservedQty - move, availableQty: b.availableQty + move };
      }),
    );
  };

  const returnStock: InventoryContextValue['returnStock'] = (batchId, qty) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        const move = Math.min(qty, b.availableQty);
        return { ...b, availableQty: b.availableQty - move, returnedQty: b.returnedQty + move };
      }),
    );
  };

  const recallBatch: InventoryContextValue['recallBatch'] = (batchId) => {
    setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, qcStatus: 'Recalled' } : b)));
  };

  // Writing off a batch moves its available + reserved quantity into damaged and marks it expired.
  const disposeBatch: InventoryContextValue['disposeBatch'] = (batchId) => {
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? {
              ...b,
              damagedQty: b.damagedQty + b.availableQty + b.reservedQty,
              availableQty: 0,
              reservedQty: 0,
              qcStatus: 'Expired',
            }
          : b,
      ),
    );
  };

  return (
    <InventoryContext.Provider
      value={{
        items,
        transfers,
        adjustments,
        batches,
        stockEntries,
        addItem,
        addBatch,
        receiveStock,
        addTransfer,
        approveTransfer,
        completeTransfer,
        cancelTransfer,
        addAdjustment,
        approveAdjustment,
        rejectAdjustment,
        reserveStock,
        releaseReservation,
        returnStock,
        recallBatch,
        disposeBatch,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
