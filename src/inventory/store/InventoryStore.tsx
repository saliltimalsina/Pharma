import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import {
  items as seedItems,
  items as mockItems,
  transfers as seedTransfers,
  adjustments as seedAdjustments,
  batches as seedBatches,
  movements as seedMovements,
  warehouses,
  deriveBin,
} from '../data/mockData';
import { fetchItems, createItem } from './itemApi';
import { fetchWarehouses } from './warehouseApi';
import {
  fetchBatches,
  releaseBatchApi,
  recallBatchApi,
  disposeBatchApi,
  releaseReservationApi,
  returnStockApi,
  reserveStockApi,
  stockOutApi,
} from './batchApi';
import {
  fetchTransfers,
  createTransfer,
  approveTransferApi,
  completeTransferApi,
  cancelTransferApi,
} from './transferApi';
import {
  fetchAdjustments,
  createAdjustment,
  approveAdjustmentApi,
  rejectAdjustmentApi,
  type CreateAdjustmentInput,
} from './adjustmentApi';
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
// One receiving line for the manual Stock-In page. There's no backend
// endpoint for this (batches are read-mostly - created as a side effect of
// GRN completion, not directly), so this stays a local-only simulation.
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
  loading: boolean;
  items: Item[];
  transfers: Transfer[];
  adjustments: Adjustment[];
  batches: Batch[];
  stockEntries: StockEntry[];
  movements: StockMovement[];
  addItem: (input: NewItemInput) => Promise<string>;
  // Local-only simulation (no backend endpoint) - see StockInLine. Returns affected batch ids.
  receiveStock: (lines: StockInLine[]) => string[];
  // Issue / consume stock. Deducts available FEFO/FIFO across the item's batches.
  stockOut: (lines: StockOutLine[]) => Promise<void>;
  addTransfer: (input: NewTransferInput, submit: boolean) => Promise<string>;
  approveTransfer: (id: string) => Promise<void>;
  completeTransfer: (id: string) => Promise<void>;
  cancelTransfer: (id: string) => Promise<void>;
  addAdjustment: (input: NewAdjustmentInput) => Promise<string>;
  approveAdjustment: (id: string, approver: string) => Promise<void>;
  rejectAdjustment: (id: string) => Promise<void>;
  reserveStock: (itemId: string, warehouseId: string, qty: number) => Promise<void>;
  releaseReservation: (batchId: string, qty: number) => Promise<void>;
  returnStock: (batchId: string, qty: number) => Promise<void>;
  recallBatch: (batchId: string) => Promise<void>;
  disposeBatch: (batchId: string) => Promise<void>;
  updateBatchBin: (batchId: string, bin: string) => void;
  // QC sign-off: moves a batch's pending-inspection quantity into available stock.
  releaseBatch: (batchId: string, approvedBy: string) => Promise<void>;
  // Refetch batches - call after an external event (e.g. a GRN completing) creates new ones.
  refreshBatches: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

let itemSeq = seedItems.length;
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
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>(seedItems);
  const [transfers, setTransfers] = useState<Transfer[]>(seedTransfers);
  const [adjustments, setAdjustments] = useState<Adjustment[]>(seedAdjustments);
  const [batches, setBatches] = useState<Batch[]>(seedBatches);
  const [movements, setMovements] = useState<StockMovement[]>(seedMovements);

  const stockEntries = useMemo(() => deriveStockEntries(batches), [batches]);

  useEffect(() => {
    Promise.allSettled([
      // Also mutated in place on `mockItems` (see the `warehouses` comment below) -
      // itemById()/etc. read directly from the mockData module, not this state.
      fetchItems()
        .then((rows) => {
          setItems(rows);
          mockItems.splice(0, mockItems.length, ...rows);
        })
        .catch((e) => console.error('Failed to load items', e)),
      // `warehouses` has no create route anywhere in the app (pure reference
      // data) - mutated in place here rather than lifted into context, so the
      // ~20 pages that already do `import { warehouses } from '../data/mockData'`
      // keep working unchanged and see the real rows once this resolves.
      fetchWarehouses()
        .then((rows) => warehouses.splice(0, warehouses.length, ...rows))
        .catch((e) => console.error('Failed to load warehouses', e)),
      fetchBatches().then(setBatches).catch((e) => console.error('Failed to load batches', e)),
      fetchTransfers().then(setTransfers).catch((e) => console.error('Failed to load transfers', e)),
      fetchAdjustments().then(setAdjustments).catch((e) => console.error('Failed to load adjustments', e)),
    ]).then(() => setLoading(false));
  }, []);

  const refreshBatches: InventoryContextValue['refreshBatches'] = async () => {
    setBatches(await fetchBatches());
  };

  const logMovements = (recs: StockMovement[]) => {
    if (recs.length) setMovements((prev) => [...prev, ...recs]);
  };

  const addItem: InventoryContextValue['addItem'] = async (input) => {
    itemSeq += 1;
    const prefix = input.category.slice(0, 3).toUpperCase() || 'ITM';
    const materialCode = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
    const item = await createItem({
      materialCode,
      materialName: input.name,
      category: input.category,
      unitOfMeasure: input.uom,
      standardShelfLifeDays: input.expiryTracking ? input.shelfLifeMonths * 30 : undefined,
      storageConditions: input.storageCondition,
      reorderLevel: input.reorderLevel,
      minStock: input.safetyStock,
      maxStock: input.maximumStock,
      standardCost: input.purchasePrice,
      costingMethod: input.costingMethod === 'FIFO' ? 'fifo' : 'fefo',
    });
    setItems((prev) => [item, ...prev]);
    mockItems.unshift(item);
    return item.id;
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

  // Issue stock out of a warehouse - the backend picks the item's batches in FEFO/FIFO
  // order and deducts available until the requested quantity is met, all-or-nothing.
  // It doesn't report which batches it touched, so movements are reconstructed by
  // diffing available qty per batch before/after against the refreshed list.
  const stockOut: InventoryContextValue['stockOut'] = async (lines) => {
    const before = new Map(batches.map((b) => [b.id, b]));
    await stockOutApi(
      lines.map((l) => ({
        rawMaterialId: l.itemId,
        warehouseId: Number(l.warehouseId),
        qty: l.quantity,
        reference: l.reference,
      })),
    );
    const fresh = await fetchBatches();
    const recs: StockMovement[] = [];
    for (const b of fresh) {
      const prev = before.get(b.id);
      const delta = b.availableQty - (prev?.availableQty ?? b.availableQty);
      if (delta === 0) continue;
      const line = lines.find((l) => l.itemId === b.itemId && l.warehouseId === b.warehouseId);
      recs.push(makeMovement('Out', b.itemId, b.batchNumber, b.warehouseId, delta, line?.reference || 'Stock Out', line?.by || ''));
    }
    setBatches(fresh);
    logMovements(recs);
  };

  const REASON_VALUE: Record<Adjustment['reason'], CreateAdjustmentInput['reason']> = {
    Damage: 'damage',
    Loss: 'loss',
    Theft: 'theft',
    'Counting Error': 'counting_error',
    'Expired Items': 'expired_items',
    'Quality Rejection': 'quality_rejection',
  };

  const addTransfer: InventoryContextValue['addTransfer'] = async (input, submit) => {
    const transfer = await createTransfer({
      fromWarehouseId: Number(input.fromWarehouseId),
      toWarehouseId: Number(input.toWarehouseId),
      reason: input.reason,
      transferDate: input.transferDate,
      submit,
      items: input.items.map((it) => ({
        rawMaterialId: it.itemId,
        batchNumber: it.batchNumber,
        currentBin: it.currentBin,
        quantity: it.quantity,
        destinationBin: it.destinationBin,
      })),
    });
    setTransfers((prev) => [transfer, ...prev]);
    return transfer.id;
  };

  const approveTransfer: InventoryContextValue['approveTransfer'] = async (id) => {
    const updated = await approveTransferApi(id);
    setTransfers((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  // Completing a transfer actually moves quantity server-side: decrements the source
  // batch, creates/tops-up a same-numbered batch in the destination warehouse - refresh
  // batches afterward so Inventory reflects it, and reconstruct movements by diffing.
  const completeTransfer: InventoryContextValue['completeTransfer'] = async (id) => {
    const transfer = transfers.find((t) => t.id === id);
    if (!transfer) return;
    const before = new Map(batches.map((b) => [b.id, b]));
    const updated = await completeTransferApi(id);
    const fresh = await fetchBatches();
    const recs: StockMovement[] = [];
    for (const b of fresh) {
      const prev = before.get(b.id);
      const delta = b.availableQty - (prev?.availableQty ?? 0);
      if (delta !== 0) recs.push(makeMovement('Transfer', b.itemId, b.batchNumber, b.warehouseId, delta, transfer.transferNumber, transfer.requestedBy));
    }
    setBatches(fresh);
    logMovements(recs);
    setTransfers((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const cancelTransfer: InventoryContextValue['cancelTransfer'] = async (id) => {
    const updated = await cancelTransferApi(id);
    setTransfers((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const addAdjustment: InventoryContextValue['addAdjustment'] = async (input) => {
    const adjustment = await createAdjustment({
      warehouseId: Number(input.warehouseId),
      type: input.type === 'Increase' ? 'increase' : 'decrease',
      reason: REASON_VALUE[input.reason],
      reference: input.reference,
      notes: input.notes,
      date: input.date,
      items: input.items.map((it) => ({
        rawMaterialId: it.itemId,
        batchNumber: it.batchNumber,
        currentQty: it.currentQty,
        actualQty: it.actualQty,
      })),
    });
    setAdjustments((prev) => [adjustment, ...prev]);
    return adjustment.id;
  };

  // Approving an adjustment reconciles system stock to the counted actual quantity -
  // the backend applies the delta onto the matching batch server-side.
  const approveAdjustment: InventoryContextValue['approveAdjustment'] = async (id, approver) => {
    const adjustment = adjustments.find((a) => a.id === id);
    const before = new Map(batches.map((b) => [b.id, b]));
    const updated = await approveAdjustmentApi(id);
    const fresh = await fetchBatches();
    const recs: StockMovement[] = [];
    for (const b of fresh) {
      const prev = before.get(b.id);
      const delta = b.availableQty - (prev?.availableQty ?? b.availableQty);
      if (delta !== 0 && adjustment) {
        recs.push(makeMovement('Adjustment', b.itemId, b.batchNumber, b.warehouseId, delta, adjustment.adjustmentNo || adjustment.reference, approver));
      }
    }
    setBatches(fresh);
    logMovements(recs);
    setAdjustments((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const rejectAdjustment: InventoryContextValue['rejectAdjustment'] = async (id) => {
    const updated = await rejectAdjustmentApi(id);
    setAdjustments((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  // Reserve stock for an item at a warehouse - the backend allocates across
  // batches FEFO/FIFO server-side; movements are reconstructed the same way as stockOut.
  const reserveStock: InventoryContextValue['reserveStock'] = async (itemId, warehouseId, qty) => {
    if (qty <= 0) return;
    const before = new Map(batches.map((b) => [b.id, b]));
    await reserveStockApi(itemId, Number(warehouseId), qty);
    const fresh = await fetchBatches();
    const recs: StockMovement[] = [];
    for (const b of fresh) {
      const prev = before.get(b.id);
      const delta = b.availableQty - (prev?.availableQty ?? b.availableQty);
      if (delta !== 0) recs.push(makeMovement('Reserve', b.itemId, b.batchNumber, b.warehouseId, delta, 'Reservation', ''));
    }
    setBatches(fresh);
    logMovements(recs);
  };

  const releaseReservation: InventoryContextValue['releaseReservation'] = async (batchId, qty) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    const move = Math.min(qty, target.reservedQty);
    if (move <= 0) return;
    const updated = await releaseReservationApi(batchId, move);
    setBatches((prev) => prev.map((b) => (b.id === batchId ? updated : b)));
    logMovements([makeMovement('Reserve', target.itemId, target.batchNumber, target.warehouseId, move, 'Reservation released', '')]);
  };

  const returnStock: InventoryContextValue['returnStock'] = async (batchId, qty) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    const move = Math.min(qty, target.availableQty);
    if (move <= 0) return;
    const updated = await returnStockApi(batchId, move);
    setBatches((prev) => prev.map((b) => (b.id === batchId ? updated : b)));
    logMovements([makeMovement('Return', target.itemId, target.batchNumber, target.warehouseId, -move, 'Return to supplier', '')]);
  };

  // A recall pulls the batch's usable stock out of circulation (into damaged) and
  // flags it Recalled — logged as a write-off of the quantity removed.
  const recallBatch: InventoryContextValue['recallBatch'] = async (batchId) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    const removed = target.availableQty + target.reservedQty;
    const updated = await recallBatchApi(batchId);
    setBatches((prev) => prev.map((b) => (b.id === batchId ? updated : b)));
    if (removed > 0) {
      logMovements([makeMovement('Write-off', target.itemId, target.batchNumber, target.warehouseId, -removed, 'Batch recall', '')]);
    }
  };

  // Writing off a batch moves its available + reserved quantity into damaged and marks it expired.
  const disposeBatch: InventoryContextValue['disposeBatch'] = async (batchId) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    const removed = target.availableQty + target.reservedQty;
    const updated = await disposeBatchApi(batchId);
    setBatches((prev) => prev.map((b) => (b.id === batchId ? updated : b)));
    if (removed > 0) {
      logMovements([makeMovement('Write-off', target.itemId, target.batchNumber, target.warehouseId, -removed, 'Disposal / write-off', '')]);
    }
  };

  // No backend endpoint exists for relocating a batch's bin - local-only for now.
  const updateBatchBin: InventoryContextValue['updateBatchBin'] = (batchId, bin) => {
    setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, bin } : b)));
  };

  // Moves whatever quantity is still pending inspection (receivedQty - availableQty -
  // reservedQty) into availableQty and marks the batch Released — the step that makes
  // GRN-received goods actually usable/reservable/sellable.
  const releaseBatch: InventoryContextValue['releaseBatch'] = async (batchId, approvedBy) => {
    const target = batches.find((b) => b.id === batchId);
    if (!target) return;
    const pending = target.receivedQty - target.availableQty - target.reservedQty;
    const updated = await releaseBatchApi(batchId);
    setBatches((prev) => prev.map((b) => (b.id === batchId ? updated : b)));
    if (pending > 0) {
      logMovements([makeMovement('In', target.itemId, target.batchNumber, target.warehouseId, pending, 'QC release', approvedBy)]);
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        loading,
        items,
        transfers,
        adjustments,
        batches,
        stockEntries,
        movements,
        addItem,
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
        refreshBatches,
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
