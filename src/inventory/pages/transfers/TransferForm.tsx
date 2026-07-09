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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import FormSelectField from '../../components/FormSelectField';
import { useInventory } from '../../store/InventoryStore';
import { ApiError } from '../../../shared/api/client';
import { warehouses } from '../../data/mockData';
import type { TransferItem } from '../../data/types';

const approvers = ['Grace Liu — Procurement Manager', 'David Kim — Warehouse Manager'];

let rowId = 0;
function blankItem(): TransferItem & { key: number } {
  rowId += 1;
  return { key: rowId, itemId: '', batchNumber: '', currentBin: '', quantity: 0, destinationBin: '' };
}

export default function TransferForm() {
  const navigate = useNavigate();
  const { items: catalogItems, addTransfer } = useInventory();

  const [fromWarehouseId, setFromWarehouseId] = useState(warehouses[0].id);
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1].id);
  const [reason, setReason] = useState('');
  const [requestedBy, setRequestedBy] = useState('Riley Carter');
  const [approver, setApprover] = useState(approvers[0]);
  const [rows, setRows] = useState([blankItem()]);

  const updateRow = (key: number, field: keyof TransferItem, value: string | number) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const canSubmit =
    reason.trim() !== '' &&
    fromWarehouseId !== toWarehouseId &&
    rows.every((r) => r.itemId !== '' && r.batchNumber.trim() !== '' && r.quantity > 0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const save = async (submit: boolean) => {
    setSubmitted(true);
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const id = await addTransfer(
        {
          fromWarehouseId,
          toWarehouseId,
          reason,
          requestedBy,
          approver,
          transferDate: new Date().toISOString().slice(0, 10),
          items: rows.map((r) => ({
            itemId: r.itemId,
            batchNumber: r.batchNumber,
            currentBin: r.currentBin,
            quantity: r.quantity,
            destinationBin: r.destinationBin,
          })),
        },
        submit,
      );
      navigate(`/inventory/transfers/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the transfer.');
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1400px' } }}>
      <PageHeader
        title="Create Transfer"
        subtitle="Move stock between warehouses or storage locations"
        actions={<Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/inventory/transfers')}>Cancel</Button>}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="General" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Transfer Number" value="TRF-2026-0042 (auto)" disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField
                  fullWidth
                  required
                  label="Source Warehouse"
                  value={fromWarehouseId}
                  onChange={(e) => setFromWarehouseId(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField
                  fullWidth
                  required
                  label="Destination Warehouse"
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                  error={submitted && toWarehouseId === fromWarehouseId}
                  helperText={submitted && toWarehouseId === fromWarehouseId ? 'Must differ from the source warehouse' : undefined}
                >
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField
                  fullWidth
                  required
                  label="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Rebalance stock for packaging line"
                  error={submitted && reason.trim() === ''}
                  helperText={submitted && reason.trim() === '' ? 'Reason is required' : undefined}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField fullWidth label="Requested By" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormSelectField fullWidth label="Approver" value={approver} onChange={(e) => setApprover(e.target.value)}>
                  {approvers.map((a) => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader
            title="Items"
            slotProps={{ title: { variant: 'subtitle2' } }}
            action={
              <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setRows((prev) => [...prev, blankItem()])}>
                Add Item
              </Button>
            }
          />
          <CardContent sx={{ pt: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product <Box component="span" sx={{ color: 'error.main' }}>*</Box></TableCell>
                  <TableCell>Batch <Box component="span" sx={{ color: 'error.main' }}>*</Box></TableCell>
                  <TableCell>Current Location</TableCell>
                  <TableCell width={100}>Quantity <Box component="span" sx={{ color: 'error.main' }}>*</Box></TableCell>
                  <TableCell>Destination Bin</TableCell>
                  <TableCell width={50} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <TextField
                        select
                        variant="standard"
                        fullWidth
                        value={row.itemId}
                        onChange={(e) => updateRow(row.key, 'itemId', e.target.value)}
                        error={submitted && row.itemId === ''}
                        helperText={submitted && row.itemId === '' ? 'Required' : undefined}
                        slotProps={{ select: { displayEmpty: true } }}
                      >
                        <MenuItem value="" disabled>
                          Select item
                        </MenuItem>
                        {catalogItems.map((ci) => (
                          <MenuItem key={ci.id} value={ci.id}>{ci.name}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        variant="standard"
                        fullWidth
                        placeholder="Batch number"
                        value={row.batchNumber}
                        onChange={(e) => updateRow(row.key, 'batchNumber', e.target.value)}
                        error={submitted && row.batchNumber.trim() === ''}
                        helperText={submitted && row.batchNumber.trim() === '' ? 'Required' : undefined}
                      />
                    </TableCell>
                    <TableCell><TextField variant="standard" fullWidth placeholder="e.g. WH01-A1-R1-S1" value={row.currentBin} onChange={(e) => updateRow(row.key, 'currentBin', e.target.value)} /></TableCell>
                    <TableCell>
                      <TextField
                        variant="standard"
                        type="number"
                        fullWidth
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, 'quantity', Number(e.target.value))}
                        error={submitted && row.quantity <= 0}
                        helperText={submitted && row.quantity <= 0 ? 'Must be > 0' : undefined}
                      />
                    </TableCell>
                    <TableCell><TextField variant="standard" fullWidth placeholder="e.g. WH03-A1-R1-S1" value={row.destinationBin} onChange={(e) => updateRow(row.key, 'destinationBin', e.target.value)} /></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" disabled={rows.length === 1} onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Review" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {rows.length} item(s) · {warehouses.find((w) => w.id === fromWarehouseId)?.name} → {warehouses.find((w) => w.id === toWarehouseId)?.name}
            </Typography>
          </CardContent>
        </Card>

        <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" disabled={!canSubmit || submitting} loading={submitting} onClick={() => save(false)}>Save as Draft</Button>
          <Button variant="contained" disabled={!canSubmit || submitting} loading={submitting} onClick={() => save(true)}>Submit for Approval</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
