import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import FormSelectField from '../../components/FormSelectField';
import { useInventory } from '../../store/InventoryStore';
import { warehouses } from '../../data/mockData';
import type { BatchStatus } from '../../data/types';

const qcStatuses: BatchStatus[] = ['Under Inspection', 'Released', 'Available', 'Quarantined', 'Expired', 'Recalled'];

export default function BatchForm() {
  const navigate = useNavigate();
  const { items, addBatch } = useInventory();

  const [batchNumber, setBatchNumber] = useState('');
  const [itemId, setItemId] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0].id);
  const [supplierName, setSupplierName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [grnNumber, setGrnNumber] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [shelfLifeMonths, setShelfLifeMonths] = useState(24);
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [qcStatus, setQcStatus] = useState<BatchStatus>('Under Inspection');
  const [receivedQty, setReceivedQty] = useState(0);

  const canSubmit = batchNumber.trim() !== '' && itemId !== '' && receivedQty > 0;

  const handleSubmit = () => {
    const availableQty = qcStatus === 'Released' || qcStatus === 'Available' ? receivedQty : 0;
    addBatch({
      batchNumber,
      itemId,
      supplierName,
      poNumber,
      grnNumber,
      warehouseId,
      manufacturingDate,
      expiryDate,
      shelfLifeMonths,
      countryOfOrigin,
      qcStatus,
      inspectionResult: qcStatus === 'Released' ? 'Pass' : 'Pending',
      approvedBy: '',
      releasedDate: qcStatus === 'Released' ? new Date().toISOString().slice(0, 10) : '',
      receivedQty,
      availableQty,
      reservedQty: 0,
      damagedQty: 0,
      returnedQty: 0,
    });
    navigate('/inventory/batches');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1400px' } }}>
      <PageHeader
        title="Create Batch"
        subtitle="Register a new manufactured or purchased batch"
        actions={<Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/inventory/batches')}>Cancel</Button>}
      />

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="General" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Batch Number" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. LM-26061" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="Product" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  <MenuItem value="">Select a product</MenuItem>
                  {items.map((it) => (
                    <MenuItem key={it.id} value={it.id}>{it.name}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="Warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Supplier" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="PO Number" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g. PO-2026-0511" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="GRN Number" value={grnNumber} onChange={(e) => setGrnNumber(e.target.value)} placeholder="e.g. GRN-2026-0311" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Manufacturing" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormField fullWidth type="date" label="Manufacturing Date" value={manufacturingDate} onChange={(e) => setManufacturingDate(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormField fullWidth type="date" label="Expiry Date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormField fullWidth type="number" label="Shelf Life (months)" value={shelfLifeMonths} onChange={(e) => setShelfLifeMonths(Number(e.target.value))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormField fullWidth label="Country of Origin" value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Quantity & Status" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth type="number" label="Received Qty" value={receivedQty} onChange={(e) => setReceivedQty(Number(e.target.value))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="QC Status" value={qcStatus} onChange={(e) => setQcStatus(e.target.value as BatchStatus)}>
                  {qcStatuses.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" onClick={() => navigate('/inventory/batches')}>Cancel</Button>
          <Button variant="contained" disabled={!canSubmit} onClick={handleSubmit}>Create Batch</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
