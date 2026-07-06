import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
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
import { useInventory } from '../../store/InventoryStore';
import { warehouseById } from '../../data/mockData';

function LabeledValue({ label, value }: { label: string; value?: string | number }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value ?? '—'}</Typography>
    </Box>
  );
}

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, batches } = useInventory();
  const item = items.find((i) => i.id === id);

  if (!item) {
    return (
      <Box>
        <Typography>Product not found.</Typography>
        <Button onClick={() => navigate('/inventory/items')}>Back to list</Button>
      </Box>
    );
  }

  const itemBatches = batches.filter((b) => b.itemId === item.id);
  const totalAvailable = itemBatches.reduce((sum, b) => sum + b.availableQty, 0);
  const totalReserved = itemBatches.reduce((sum, b) => sum + b.reservedQty, 0);
  const stockLevel = totalAvailable === 0 ? 'Out of Stock' : totalAvailable <= item.reorderLevel ? 'Low Stock' : 'In Stock';

  const overviewTab = (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>General Information</Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="SKU" value={item.sku} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Category" value={item.category} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Brand" value={item.brand} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Manufacturer" value={item.manufacturer} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="UOM" value={item.uom} /></Grid>
              <Grid size={{ xs: 12 }}><LabeledValue label="Description" value={item.description} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Storage Condition" value={item.storageCondition} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Shelf Life" value={item.expiryTracking ? `${item.shelfLifeMonths} months` : 'Not tracked'} /></Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Stock Status</Typography>
            <StatusChip status={stockLevel} />
            <Stack sx={{ mt: 2, gap: 1.5 }}>
              <LabeledValue label="Available" value={totalAvailable.toLocaleString()} />
              <LabeledValue label="Reserved" value={totalReserved.toLocaleString()} />
              <LabeledValue label="Reorder Level" value={item.reorderLevel.toLocaleString()} />
              <LabeledValue label="Preferred Supplier" value={item.preferredSupplier} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const stockTab = (
    <Card variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Warehouse</TableCell>
            <TableCell>Batch</TableCell>
            <TableCell align="right">Available</TableCell>
            <TableCell align="right">Reserved</TableCell>
            <TableCell>Expiry</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {itemBatches.map((b) => (
            <TableRow key={b.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/inventory/batches/${b.id}`)}>
              <TableCell>{warehouseById(b.warehouseId)?.name}</TableCell>
              <TableCell sx={{ fontWeight: 500 }}>{b.batchNumber}</TableCell>
              <TableCell align="right">{b.availableQty.toLocaleString()}</TableCell>
              <TableCell align="right">{b.reservedQty.toLocaleString()}</TableCell>
              <TableCell><ExpiryChip dateStr={b.expiryDate} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const batchesTab = (
    <Card variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Batch Number</TableCell>
            <TableCell>Manufacturing Date</TableCell>
            <TableCell>Expiry Date</TableCell>
            <TableCell align="right">Available Qty</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {itemBatches.map((b) => (
            <TableRow key={b.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/inventory/batches/${b.id}`)}>
              <TableCell sx={{ fontWeight: 500 }}>{b.batchNumber}</TableCell>
              <TableCell>{b.manufacturingDate}</TableCell>
              <TableCell>{b.expiryDate}</TableCell>
              <TableCell align="right">{b.availableQty.toLocaleString()}</TableCell>
              <TableCell><StatusChip status={b.qcStatus} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const purchaseHistoryTab = (
    <Card variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>PO Number</TableCell>
            <TableCell>GRN Number</TableCell>
            <TableCell>Supplier</TableCell>
            <TableCell align="right">Qty Received</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {itemBatches.map((b) => (
            <TableRow key={b.id} hover>
              <TableCell sx={{ fontWeight: 500 }}>{b.poNumber}</TableCell>
              <TableCell>{b.grnNumber}</TableCell>
              <TableCell>{b.supplierName}</TableCell>
              <TableCell align="right">{b.receivedQty.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title={item.name}
        subtitle={`${item.sku} · ${item.category}`}
        actions={
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/inventory/items')}>Back</Button>
        }
      />
      <DetailTabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          { label: 'Current Stock', content: stockTab },
          { label: 'Batches', content: batchesTab },
          { label: 'Purchase History', content: purchaseHistoryTab },
        ]}
      />
    </Box>
  );
}
