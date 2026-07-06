import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import DetailTabs from '../../components/DetailTabs';
import { ExpiryChip } from '../../components/expiryUtils';
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
  const { stockEntries } = useInventory();
  const stock = stockEntries.find((s) => s.id === (id ?? ''));

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
  const total = stock.availableQty + stock.reservedQty + stock.damagedQty + stock.pendingInspectionQty;
  const level = stock.availableQty === 0 ? 'Out of Stock' : stock.availableQty <= (item?.reorderLevel ?? 0) ? 'Low Stock' : 'In Stock';

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
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Bin Location" value={stock.bin} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Supplier" value={stock.supplierName} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Purchase Order" value={stock.poNumber} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="GRN" value={stock.grnNumber} /></Grid>
            </Grid>
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
      <List>
        <ListItem divider>
          <ListItemText primary={`Stock In — ${total.toLocaleString()} received`} secondary={`${stock.grnNumber} · ${stock.supplierName}`} />
        </ListItem>
        {stock.reservedQty > 0 && (
          <ListItem divider>
            <ListItemText primary={`${stock.reservedQty.toLocaleString()} reserved`} secondary="Reserved against open sales / production orders" />
          </ListItem>
        )}
        {stock.damagedQty > 0 && (
          <ListItem>
            <ListItemText primary={`${stock.damagedQty.toLocaleString()} marked damaged`} secondary="Adjusted out via Stock Adjustment" />
          </ListItem>
        )}
      </List>
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
