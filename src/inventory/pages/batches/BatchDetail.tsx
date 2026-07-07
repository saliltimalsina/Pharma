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
import Link from '@mui/material/Link';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
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

function LabeledValue({ label, value, onClick }: { label: string; value?: string | number; onClick?: () => void }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      {onClick ? (
        <Link component="button" type="button" variant="body2" onClick={onClick} sx={{ fontWeight: 500, textAlign: 'left' }}>
          {value || '—'}
        </Link>
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{value || '—'}</Typography>
      )}
    </Box>
  );
}

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { batches, updateBatchBin, recallBatch, disposeBatch } = useInventory();
  const batch = batches.find((b) => b.id === (id ?? ''));
  const [binDraft, setBinDraft] = useState(batch?.bin ?? '');
  const [confirmAction, setConfirmAction] = useState<null | 'recall' | 'dispose'>(null);

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
  // Recall / dispose act on live stock; a batch already recalled or expired is terminal.
  const canModify = batch.qcStatus !== 'Recalled' && batch.qcStatus !== 'Expired';

  const overviewTab = (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>General</Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Batch Number" value={batch.batchNumber} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Product" value={item?.name} onClick={() => navigate(`/inventory/items/${batch.itemId}`)} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Supplier" value={batch.supplierName} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Purchase Order" value={batch.poNumber} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="GRN" value={batch.grnNumber} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Warehouse" value={warehouse?.name} onClick={() => navigate(`/inventory/warehouses/${batch.warehouseId}`)} /></Grid>
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
                disabled={binDraft.trim() === '' || binDraft === batch.bin}
                onClick={() => updateBatchBin(batch.id, binDraft.trim())}
              >
                Save Location
              </Button>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Format: Warehouse-Aisle-Rack-Shelf. Updates the stock view for this batch.
              </Typography>
            </Stack>
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
          <>
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/inventory/batches')}>Back</Button>
            <Button variant="outlined" onClick={() => navigate(`/inventory/ledger?batch=${batch.batchNumber}`)}>
              View in Stock Ledger
            </Button>
            {canModify && (
              <>
                <Button variant="outlined" color="warning" onClick={() => setConfirmAction('recall')}>Recall</Button>
                <Button variant="outlined" color="error" onClick={() => setConfirmAction('dispose')}>Dispose</Button>
              </>
            )}
          </>
        }
      />
      <DetailTabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          { label: 'Movement', content: movementTab },
          { label: 'Inspection', content: inspectionTab },
        ]}
      />

      <Dialog open={confirmAction !== null} onClose={() => setConfirmAction(null)} fullWidth maxWidth="xs">
        <DialogTitle>{confirmAction === 'recall' ? 'Recall Batch' : 'Dispose Batch'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {confirmAction === 'recall'
              ? `Recall batch ${batch.batchNumber}? Its available and reserved stock is pulled from circulation into damaged and the batch is flagged Recalled.`
              : `Dispose batch ${batch.batchNumber}? Its available and reserved stock is written off into damaged and the batch is marked Expired.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={confirmAction === 'recall' ? 'warning' : 'error'}
            onClick={() => {
              if (confirmAction === 'recall') recallBatch(batch.id);
              else if (confirmAction === 'dispose') disposeBatch(batch.id);
              setConfirmAction(null);
            }}
          >
            {confirmAction === 'recall' ? 'Recall' : 'Dispose'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
