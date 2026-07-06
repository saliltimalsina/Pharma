import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import FormSelectField from '../../components/FormSelectField';
import { useProcurement } from '../../store/ProcurementStore';
import { useInventory } from '../../../inventory/store/InventoryStore';
import type { StockInLine } from '../../../inventory/store/InventoryStore';
import { warehouses as inventoryWarehouses } from '../../../inventory/data/mockData';
import type { GrnItem, GrnInspectionResult, PurchaseOrder } from '../../data/types';

const inspectionChecks = ['Packaging', 'Temperature', 'Damage', 'Quality'];

// Build editable receiving lines from a purchase order's items.
function linesFromPo(po: PurchaseOrder): GrnItem[] {
  return po.items.map((it) => ({
    product: it.product,
    orderedQty: it.qty,
    receivedQty: it.qty,
    acceptedQty: it.qty,
    rejectedQty: 0,
    batchNumber: '',
    expiryDate: '',
  }));
}

// Map a GRN warehouse label (e.g. "Main Warehouse - WH01") to an inventory warehouse id.
function resolveWarehouseId(label: string): string {
  const l = label.toLowerCase();
  const match = inventoryWarehouses.find(
    (wh) => l.includes(wh.name.toLowerCase()) || l.includes(wh.code.toLowerCase()),
  );
  return match?.id ?? 'WH-01';
}

export default function GRNForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromPo = searchParams.get('fromPo');
  const { purchaseOrders, addGrn } = useProcurement();
  const { items: inventoryItems, receiveStock } = useInventory();

  const today = new Date().toISOString().slice(0, 10);

  const initialPoId =
    fromPo && purchaseOrders.some((p) => p.id === fromPo) ? fromPo : purchaseOrders[0].id;

  const [poId, setPoId] = useState(initialPoId);
  const po = purchaseOrders.find((p) => p.id === poId) ?? purchaseOrders[0];

  const [lines, setLines] = useState<GrnItem[]>(() => linesFromPo(po));
  const [warehouse, setWarehouse] = useState(po.warehouse);
  const [receivedDate, setReceivedDate] = useState(today);
  const [receivedBy, setReceivedBy] = useState('David Kim');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [checks, setChecks] = useState<Record<string, string>>({
    Packaging: 'pass',
    Temperature: 'pass',
    Damage: 'pass',
    Quality: 'pass',
  });

  const handlePoChange = (newId: string) => {
    setPoId(newId);
    const newPo = purchaseOrders.find((p) => p.id === newId) ?? purchaseOrders[0];
    setLines(linesFromPo(newPo));
    setWarehouse(newPo.warehouse);
  };

  const updateLine = (index: number, field: keyof GrnItem, value: string | number) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));

  const save = (complete: boolean) => {
    const grnItems: GrnItem[] = lines.map((l) => ({ ...l }));
    const inspection: GrnInspectionResult[] = inspectionChecks.map((check) => ({
      check,
      result: checks[check] === 'fail' ? 'fail' : 'pass',
    }));
    const grnId = addGrn(
      {
        poNumber: po.poNumber,
        vendorName: po.vendorName,
        warehouse,
        receivedDate,
        receivedBy,
        deliveryNote,
        items: grnItems,
        inspection,
      },
      complete,
    );

    // Cross-module cascade: on completion, roll accepted goods into inventory stock.
    if (complete) {
      const stockLines: StockInLine[] = [];
      for (const line of grnItems) {
        if (line.acceptedQty <= 0) continue;
        const invItem = inventoryItems.find(
          (it) => it.name.toLowerCase() === line.product.toLowerCase(),
        );
        if (!invItem) continue;
        stockLines.push({
          itemId: invItem.id,
          batchNumber: line.batchNumber,
          warehouseId: resolveWarehouseId(warehouse),
          quantity: line.acceptedQty,
          expiryDate: line.expiryDate,
          supplierName: po.vendorName,
          poNumber: po.poNumber,
          grnNumber: grnId,
          qcStatus: 'Under Inspection',
        });
      }
      if (stockLines.length) receiveStock(stockLines);
    }

    navigate('/procurement/grn/' + grnId);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1400px' } }}>
      <PageHeader
        title="Create GRN"
        subtitle="Record and inspect received goods against a purchase order"
        actions={
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/procurement/grn')}>Cancel</Button>
        }
      />

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="General" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" label="GRN Number" value="GRN-2026-0312 (auto)" disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth size="small" label="Purchase Order" value={poId} onChange={(e) => handlePoChange(e.target.value)}>
                  {purchaseOrders.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.poNumber} — {p.vendorName}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" label="Vendor" value={po.vendorName} disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" label="Warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" type="date" label="Received Date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" label="Received By" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" label="Delivery Note" placeholder="DN-xxxxx" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Received Items" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Ordered Qty</TableCell>
                  <TableCell align="right">Received Qty</TableCell>
                  <TableCell align="right">Accepted Qty</TableCell>
                  <TableCell align="right">Rejected Qty</TableCell>
                  <TableCell>Batch Number</TableCell>
                  <TableCell>Expiry Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontWeight: 500 }}>{line.product}</TableCell>
                    <TableCell align="right">{line.orderedQty} {po.items[i]?.unit}</TableCell>
                    <TableCell align="right"><TextField variant="standard" type="number" value={line.receivedQty} onChange={(e) => updateLine(i, 'receivedQty', Number(e.target.value))} sx={{ width: 90 }} /></TableCell>
                    <TableCell align="right"><TextField variant="standard" type="number" value={line.acceptedQty} onChange={(e) => updateLine(i, 'acceptedQty', Number(e.target.value))} sx={{ width: 90 }} /></TableCell>
                    <TableCell align="right"><TextField variant="standard" type="number" value={line.rejectedQty} onChange={(e) => updateLine(i, 'rejectedQty', Number(e.target.value))} sx={{ width: 90 }} /></TableCell>
                    <TableCell><TextField variant="standard" value={line.batchNumber} onChange={(e) => updateLine(i, 'batchNumber', e.target.value)} placeholder="e.g. LM-26071" sx={{ width: 120 }} /></TableCell>
                    <TableCell><TextField variant="standard" type="date" value={line.expiryDate} onChange={(e) => updateLine(i, 'expiryDate', e.target.value)} sx={{ width: 150 }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Inspection" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={2}>
              {inspectionChecks.map((check) => (
                <Stack key={check} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{check}</Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={checks[check]}
                    onChange={(_, v) => v && setChecks((prev) => ({ ...prev, [check]: v }))}
                  >
                    <ToggleButton value="pass" color="success">Pass</ToggleButton>
                    <ToggleButton value="fail" color="error">Fail</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" onClick={() => save(false)}>Save as Draft</Button>
          <Button variant="contained" onClick={() => save(true)}>Complete Receipt</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
