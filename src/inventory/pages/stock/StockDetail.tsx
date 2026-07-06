import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import DetailTabs from '../../components/DetailTabs';
import { ExpiryChip } from '../../components/expiryUtils';
import { MovementChip, SignedQty } from '../../components/movementUtils';
import { useInventory } from '../../store/InventoryStore';
import { itemById, warehouseById } from '../../data/mockData';

function LabeledValue({ label, value }: { label: string; value?: string | number }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value ?? '—'}</Typography>
    </Box>
  );
}

export default function StockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { stockEntries, batches, movements, updateBatchBin } = useInventory();
  const stock = stockEntries.find((s) => s.id === (id ?? ''));
  const batch = stock
    ? batches.find((b) => b.batchNumber === stock.batchNumber && b.warehouseId === stock.warehouseId)
    : undefined;
  const [binDraft, setBinDraft] = useState(stock?.bin ?? '');

  if (!stock) {
    return (
      <Box>
        <Typography>Stock entry not found.</Typography>
        <Button onClick={() => navigate('/inventory/stock')}>Back to list</Button>
      </Box>
    );
  }

  const item = itemById(stock.itemId);
  const warehouse = warehouseById(stock.warehouseId);
  const level = stock.availableQty === 0 ? 'Out of Stock' : stock.availableQty <= (item?.reorderLevel ?? 0) ? 'Low Stock' : 'In Stock';

  // Real movement history for this batch at this warehouse, newest first.
  const batchMovements = movements
    .filter((m) => m.batchNumber === stock.batchNumber && m.warehouseId === stock.warehouseId)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)));

  const overviewTab = (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>General</Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Product" value={item?.name} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Warehouse" value={warehouse?.name} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Batch" value={stock.batchNumber} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Supplier" value={stock.supplierName} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Purchase Order" value={stock.poNumber} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="GRN" value={stock.grnNumber} /></Grid>
            </Grid>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Bin & Rack Location</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, alignItems: { sm: 'center' }, mt: 1 }}>
              <TextField
                label="Bin Location"
                size="small"
                value={binDraft}
                onChange={(e) => setBinDraft(e.target.value)}
                placeholder="e.g. WH01-A2-R1-S3"
                sx={{ minWidth: 260 }}
              />
              <Button
                variant="contained"
                disabled={!batch || binDraft.trim() === '' || binDraft === stock.bin}
                onClick={() => batch && updateBatchBin(batch.id, binDraft.trim())}
              >
                Save Location
              </Button>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Format: Warehouse-Aisle-Rack-Shelf.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Inventory</Typography>
            <Stack direction="row" sx={{ gap: 1, mb: 2 }}>
              <StatusChip status={level} />
              <ExpiryChip dateStr={stock.expiryDate} />
            </Stack>
            <Stack sx={{ gap: 1.5 }}>
              <LabeledValue label="Available Quantity" value={stock.availableQty.toLocaleString()} />
              <LabeledValue label="Reserved Quantity" value={stock.reservedQty.toLocaleString()} />
              <LabeledValue label="Damaged Quantity" value={stock.damagedQty.toLocaleString()} />
              <LabeledValue label="Pending Inspection" value={stock.pendingInspectionQty.toLocaleString()} />
              <LabeledValue label="Total Value" value={item ? `$${(item.averageCost * stock.availableQty).toLocaleString()}` : '—'} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const movementTab = (
    <Card variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell>Reference</TableCell>
            <TableCell>By</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {batchMovements.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} sx={{ color: 'text.secondary' }}>No movements recorded for this batch.</TableCell>
            </TableRow>
          )}
          {batchMovements.map((m) => (
            <TableRow key={m.id} hover>
              <TableCell>{m.date}</TableCell>
              <TableCell><MovementChip type={m.type} /></TableCell>
              <TableCell align="right"><SignedQty qty={m.qty} /></TableCell>
              <TableCell>{m.reference}</TableCell>
              <TableCell>{m.by || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const batchTab = (
    <Card variant="outlined">
      <CardContent>
        <Button variant="text" onClick={() => navigate(`/inventory/batches?search=${stock.batchNumber}`)}>
          View full batch record →
        </Button>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Batch Number" value={stock.batchNumber} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Expiry Date" value={stock.expiryDate} /></Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const purchaseHistoryTab = (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Purchase Order" value={stock.poNumber} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="GRN" value={stock.grnNumber} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Supplier" value={stock.supplierName} /></Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title={`${item?.name} · ${stock.batchNumber}`}
        subtitle={`${warehouse?.name} · ${stock.bin}`}
        actions={
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/inventory/stock')}>Back</Button>
        }
      />
      <DetailTabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          { label: 'Movement', content: movementTab },
          { label: 'Batch', content: batchTab },
          { label: 'Purchase History', content: purchaseHistoryTab },
        ]}
      />
    </Box>
  );
}
