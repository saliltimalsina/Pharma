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
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
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
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value || '—'}</Typography>
    </Box>
  );
}

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { batches } = useInventory();
  const batch = batches.find((b) => b.id === (id ?? ''));

  if (!batch) {
    return (
      <Box>
        <Typography>Batch not found.</Typography>
        <Button onClick={() => navigate('/inventory/batches')}>Back to list</Button>
      </Box>
    );
  }

  const item = itemById(batch.itemId);
  const warehouse = warehouseById(batch.warehouseId);
  const passed = batch.inspectionResult.toLowerCase().startsWith('pass');

  const overviewTab = (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>General</Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Batch Number" value={batch.batchNumber} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Product" value={item?.name} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Supplier" value={batch.supplierName} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Purchase Order" value={batch.poNumber} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="GRN" value={batch.grnNumber} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Warehouse" value={warehouse?.name} /></Grid>
            </Grid>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Manufacturing</Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Manufacturing Date" value={batch.manufacturingDate} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Expiry Date" value={batch.expiryDate} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Shelf Life" value={`${batch.shelfLifeMonths} months`} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Country of Origin" value={batch.countryOfOrigin} /></Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Status</Typography>
            <Stack direction="row" sx={{ gap: 1, mb: 2 }}>
              <StatusChip status={batch.qcStatus} />
              <ExpiryChip dateStr={batch.expiryDate} />
            </Stack>
            <Stack sx={{ gap: 1.5 }}>
              <LabeledValue label="Received Qty" value={batch.receivedQty.toLocaleString()} />
              <LabeledValue label="Available Qty" value={batch.availableQty.toLocaleString()} />
              <LabeledValue label="Reserved Qty" value={batch.reservedQty.toLocaleString()} />
              <LabeledValue label="Damaged Qty" value={batch.damagedQty.toLocaleString()} />
              <LabeledValue label="Returned Qty" value={batch.returnedQty.toLocaleString()} />
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
          <ListItemText primary={`Received ${batch.receivedQty.toLocaleString()} via ${batch.grnNumber}`} secondary={batch.supplierName} />
        </ListItem>
        {batch.releasedDate && (
          <ListItem divider>
            <ListItemText primary={`Released to available stock`} secondary={batch.releasedDate} />
          </ListItem>
        )}
        {batch.reservedQty > 0 && (
          <ListItem>
            <ListItemText primary={`${batch.reservedQty.toLocaleString()} reserved`} secondary="Against open production/sales orders" />
          </ListItem>
        )}
      </List>
    </Card>
  );

  const inspectionTab = (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="QC Status" value={batch.qcStatus} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Approved By" value={batch.approvedBy} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Released Date" value={batch.releasedDate} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><LabeledValue label="Certificates" value="COA on file" /></Grid>
        </Grid>
        <List sx={{ mt: 2 }}>
          <ListItem divider>
            <ListItemIcon>
              {passed ? <CheckCircleRoundedIcon color="success" /> : <CancelRoundedIcon color="error" />}
            </ListItemIcon>
            <ListItemText primary="Inspection Result" secondary={batch.inspectionResult} />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title={batch.batchNumber}
        subtitle={item?.name}
        actions={
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/inventory/batches')}>Back</Button>
        }
      />
      <DetailTabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          { label: 'Movement', content: movementTab },
          { label: 'Inspection', content: inspectionTab },
        ]}
      />
    </Box>
  );
}
