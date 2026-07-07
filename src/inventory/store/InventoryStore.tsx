import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import {
  items as seedItems,
  transfers as seedTransfers,
  adjustments as seedAdjustments,
  batches as seedBatches,
  movements as seedMovements,
  deriveBin,
  itemById,
} from '../data/mockData';
import { orderBatchesByCosting } from '../data/costing';
import type {
  Item,
  Transfer,
  Adjustment,
  TransferItem,
  AdjustmentItem,
  Batch,
  StockEntry,
  BatchStatus,
  StockMovement,
  MovementType,
} from '../data/types';

type NewItemInput = Omit<Item, 'id' | 'sku' | 'status'>;
type NewTransferInput = Omit<Transfer, 'id' | 'transferNumber' | 'status'> & { items: TransferItem[] };
type NewAdjustmentInput = Omit<Adjustment, 'id' | 'adjustmentNo' | 'status' | 'approver'> & {
  items: AdjustmentItem[];
};
type NewBatchInput = Omit<Batch, 'id' | 'bin'> & { bin?: string };

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

// One issue/consume line — Stock-Out reduces available stock FEFO/FIFO across batches.
export interface StockOutLine {
  itemId: string;
  warehouseId: string;
  quantity: number;
  reference: string;
  by?: string;
}

interface InventoryContextValue {
  items: Item[];
  transfers: Transfer[];
  adjustments: Adjustment[];
  batches: Batch[];
  stockEntries: StockEntry[];
  movements: StockMovement[];
  addItem: (input: NewItemInput) => string;
  addBatch: (input: NewBatchInput) => string;
  // Create or top-up batches from a receipt (Stock-In / GRN). Returns affected batch ids.
  receiveStock: (lines: StockInLine[]) => string[];
  // Issue / consume stock. Deducts available FEFO/FIFO across the item's batches.
  stockOut: (lines: StockOutLine[]) => void;
  addTransfer: (input: NewTransferInput, submit: boolean) => string;
  approveTransfer: (id: string) => void;
  completeTransfer: (id: string) => void;
  cancelTransfer: (id: string) => void;
  addAdjustment: (input: NewAdjustmentInput) => string;
  approveAdjustment: (id: string, approver: string) => void;
  rejectAdjustment: (id: string, approver: string) => void;
  reserveStock: (itemId: string, warehouseId: string, qty: number) => void;
  releaseReservation: (batchId: string, qty: number) => void;
  returnStock: (batchId: string, qty: number) => void;
  recallBatch: (batchId: string) => void;
  disposeBatch: (batchId: string) => void;
  updateBatchBin: (batchId: string, bin: string) => void;
  // QC sign-off: moves a batch's pending-inspection quantity into available stock.
  releaseBatch: (batchId: string, approvedBy: string) => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

let itemSeq = seedItems.length;
let transferSeq = seedTransfers.length;
let adjustmentSeq = seedAdjustments.length;
let batchSeq = seedBatches.length;
let movementSeq = seedMovements.length;

const today = () => new Date().toISOString().slice(0, 10);

// Build a ledger record. Called in action bodies (not inside setState updaters) so
// the sequence counter stays deterministic under StrictMode double-invocation.
function makeMovement(
  type: MovementType,
  itemId: string,
  batchNumber: string,
  warehouseId: string,
  qty: number,
  reference: string,
  by: string,
): StockMovement {
  movementSeq += 1;
  return { id: `MOV-${String(movementSeq).padStart(4, '0')}`, date: today(), type, itemId, batchNumber, warehouseId, qty, reference, by };
}

// Derived stock-entry view over batches — same id as the underlying batch, since a
// stock entry and its batch are the same record viewed from two angles (list/detail
// pages present both sets of columns together instead of splitting across two pages).
function deriveStockEntries(batches: Batch[]): StockEntry[] {
  return batches.map((b) => ({
    id: b.id,
    itemId: b.itemId,
    batchNumber: b.batchNumber,
    warehouseId: b.warehouseId,
    bin: b.bin,
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
  const [movements, setMovements] = useState<StockMovement[]>(seedMovements);

  const stockEntries = useMemo(() => deriveStockEntries(batches), [batches]);

  const logMovements = (recs: StockMovement[]) => {
    if (recs.length) setMovements((prev) => [...prev, ...recs]);
  };

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
    const bin = input.bin && input.bin.trim() !== '' ? input.bin : deriveBin(input.warehouseId, batchSeq);
    const { bin: _drop, ...rest } = input;
    const batch: Batch = { ...rest, id, bin };
    setBatches((prev) => [...prev, batch]);
    if (batch.receivedQty > 0) {
      logMovements([
        makeMovement('In', batch.itemId, batch.batchNumber, batch.warehouseId, batch.receivedQty, batch.grnNumber || 'Batch created', batch.supplierName || batch.approvedBy),
      ]);
    }
    return id;
  };

  const receiveStock: InventoryContextValue['receiveStock'] = (lines) => {
    const affected: string[] = [];
    const recs: StockMovement[] = [];
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
          bin: deriveBin(line.warehouseId, batchSeq),
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
      recs.push(makeMovement('In', line.itemId, line.batchNumber, line.warehouseId, line.quantity, line.grnNumber || line.poNumber || 'Stock In', line.supplierName));
    }
    setBatches(next);
    logMovements(recs);
    return affected;
  };

  // Issue stock out of a warehouse. For each line we pick the item's batches in the
  // configured costing order (FEFO by expiry, or FIFO by receipt) and deduct available
  // until the requested quantity is met or the on-hand runs out.
  const stockOut: InventoryContextValue['stockOut'] = (lines) => {
    const next = [...batches];
    const recs: StockMovement[] = [];
    for (const line of lines) {
      if (line.quantity <= 0) continue;
      const method = itemById(line.itemId)?.costingMethod ?? 'FEFO';
      const pool = orderBatchesByCosting(
        next.filter((b) => b.itemId === line.itemId && b.warehouseId === line.warehouseId && b.availableQty > 0),
        method,
      );
      let remaining = line.quantity;
      for (const b of pool) {
        if (remaining <= 0) break;
        const idx = next.findIndex((x) => x.id === b.id);
        const cur = next[idx];
        const take = Math.min(remaining, cur.availableQty);
        if (take <= 0) continue;
        next[idx] = { ...cur, availableQty: cur.availableQty - take };
        remaining -= take;
        recs.push(makeMovement('Out', line.itemId, cur.batchNumber, line.warehouseId, -take, line.reference || 'Stock Out', line.by || ''));
      }
    }
    setBatches(next);
    logMovements(recs);
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
    const recs: StockMovement[] = [];
    for (const line of transfer.items) {
      if (line.quantity <= 0) continue;
      const srcIdx = next.findIndex(
        (b) => b.batchNumber === line.batchNumber && b.warehouseId === transfer.fromWarehouseId,
      );
      if (srcIdx < 0) continue;
      const src = next[srcIdx];
      const moveQty = Math.min(line.quantity, src.availableQty);
      if (moveQty <= 0) continue;
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
            bin: line.destinationBin && line.destinationBin.trim() !== '' ? line.destinationBin : deriveBin(transfer.toWarehouseId, batchSeq),
            receivedQty: moveQty,
            availableQty: moveQty,
            reservedQty: 0,
            damagedQty: 0,
            returnedQty: 0,
          },
        ];
      }
      recs.push(makeMovement('Transfer', line.itemId, line.batchNumber, transfer.fromWarehouseId, -moveQty, transfer.transferNumber, transfer.requestedBy));
      recs.push(makeMovement('Transfer', line.itemId, line.batchNumber, transfer.toWarehouseId, moveQty, transfer.transferNumber, transfer.requestedBy));
    }
    setBatches(next);
    logMovements(recs);
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
    const recs: StockMovement[] = [];
    if (adjustment) {
      const next = [...batches];
      for (const line of adjustment.items) {
        const idx = next.findIndex(
          (b) => b.batchNumber === line.batchNumber && b.warehouseId === adjustment.warehouseId,
        );
        if (idx < 0) continue;
        const b = next[idx];
        const delta = line.actualQty - line.currentQty;
        next[idx] = { ...b, availableQty: Math.max(0, b.availableQty + delta) };
        recs.push(makeMovement('Adjustment', line.itemId, line.batchNumber, adjustment.warehouseId, delta, adjustment.adjustmentNo || adjustment.reference, approver));
      }
      setBatches(next);
      logMovements(recs);
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

  // Reserve stock for an item at a warehouse. Allocation follows the item's costing
  // method (FEFO earliest-expiry first) across its available batches.
  const reserveStock: InventoryContextValue['reserveStock'] = (itemId, warehouseId, qty) => {
    if (qty <= 0) return;
    const method = itemById(itemId)?.costingMethod ?? 'FEFO';
    const pool = orderBatchesByCosting(
      batches.filter((b) => b.itemId === itemId && b.warehouseId === warehouseId && b.availableQty > 0),
      method,
    );
    let remaining = qty;
    const next = [...batches];
    const recs: StockMovement[] = [];
    for (const b of pool) {
      if (remaining <= 0) break;
      const idx = next.findIndex((x) => x.id === b.id);
      const cur = next[idx];
      const move = Math.min(remaining, cur.availableQty);
      if (move <= 0) continue;
      next[idx] = { ...cur, availableQty: cur.availableQty - move, reservedQty: cur.reservedQty + move };
      remaining -= move;
      recs.push(makeMovement('Reserve', itemId, cur.batchNumber, warehouseId, -move, 'Reservation', ''));
    }
    setBatches(next);
    logMovements(recs);
  };

  const releaseReservation: InventoryContextValue['releaseReservation'] = (batchId, qty) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    const move = Math.min(qty, target.reservedQty);
    if (move <= 0) return;
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? { ...b, reservedQty: b.reservedQty - move, availableQty: b.availableQty + move }
          : b,
      ),
    );
    logMovements([makeMovement('Reserve', target.itemId, target.batchNumber, target.warehouseId, move, 'Reservation released', '')]);
  };

  const returnStock: InventoryContextValue['returnStock'] = (batchId, qty) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    const move = Math.min(qty, target.availableQty);
    if (move <= 0) return;
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? { ...b, availableQty: b.availableQty - move, returnedQty: b.returnedQty + move }
          : b,
      ),
    );
    logMovements([makeMovement('Return', target.itemId, target.batchNumber, target.warehouseId, -move, 'Return to supplier', '')]);
  };

  // A recall pulls the batch's usable stock out of circulation (into damaged) and
  // flags it Recalled — logged as a write-off of the quantity removed.
  const recallBatch: InventoryContextValue['recallBatch'] = (batchId) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    const removed = target.availableQty + target.reservedQty;
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? { ...b, qcStatus: 'Recalled', damagedQty: b.damagedQty + b.availableQty + b.reservedQty, availableQty: 0, reservedQty: 0 }
          : b,
      ),
    );
    if (removed > 0) {
      logMovements([makeMovement('Write-off', target.itemId, target.batchNumber, target.warehouseId, -removed, 'Batch recall', '')]);
    }
  };

  // Writing off a batch moves its available + reserved quantity into damaged and marks it expired.
  const disposeBatch: InventoryContextValue['disposeBatch'] = (batchId) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    const removed = target.availableQty + target.reservedQty;
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
    if (removed > 0) {
      logMovements([makeMovement('Write-off', target.itemId, target.batchNumber, target.warehouseId, -removed, 'Disposal / write-off', '')]);
    }
  };

  const updateBatchBin: InventoryContextValue['updateBatchBin'] = (batchId, bin) => {
    setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, bin } : b)));
  };

  // Moves whatever quantity is still pending inspection (receivedQty - availableQty -
  // reservedQty) into availableQty and marks the batch Released — the step that makes
  // GRN-received goods actually usable/reservable/sellable.
  const releaseBatch: InventoryContextValue['releaseBatch'] = (batchId, approvedBy) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    const pending = target.receivedQty - target.availableQty - target.reservedQty;
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? {
              ...b,
              qcStatus: 'Released',
              inspectionResult: 'Pass',
              approvedBy,
              releasedDate: today(),
              availableQty: b.availableQty + Math.max(0, pending),
            }
          : b,
      ),
    );
    if (pending > 0) {
      logMovements([makeMovement('In', target.itemId, target.batchNumber, target.warehouseId, pending, 'QC release', approvedBy)]);
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        items,
        transfers,
        adjustments,
        batches,
        stockEntries,
        movements,
        addItem,
        addBatch,
        receiveStock,
        stockOut,
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
        updateBatchBin,
        releaseBatch,
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
