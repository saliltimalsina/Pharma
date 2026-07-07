import { useMemo, useState } from 'react';
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
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import FormSelectField from '../../components/FormSelectField';
import { useFinance } from '../../store/FinanceStore';
import { purchaseOrders, grns } from '../../../procurement/data/mockData';

export default function BillForm() {
  const navigate = useNavigate();
  const { addBill } = useFinance();

  const [poNumber, setPoNumber] = useState(purchaseOrders[0].poNumber);
  const [grnNumber, setGrnNumber] = useState('—');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');

  const po = purchaseOrders.find((p) => p.poNumber === poNumber) ?? purchaseOrders[0];
  const relatedGrns = grns.filter((g) => g.poNumber === po.poNumber);

  const lines = useMemo(
    () => po.items.map((it) => ({
      product: it.product,
      batchNumber: relatedGrns[0]?.items[0]?.batchNumber ?? '—',
      quantity: it.qty,
      unitCost: it.unitPrice,
      vat: it.vat,
    })),
    [po, relatedGrns],
  );

  const amount = lines.reduce((sum, l) => {
    const base = l.quantity * l.unitCost;
    return sum + base + (base * l.vat) / 100;
  }, 0);

  const handleSubmit = () => {
    const id = addBill({
      vendorId: po.vendorId,
      vendorName: po.vendorName,
      poNumber: po.poNumber,
      grnNumber,
      invoiceDate,
      dueDate,
      amount,
      lines,
    });
    navigate(`/finance/bills/${id}`);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1400px' } }}>
      <PageHeader
        title="Record Supplier Bill"
        subtitle="Match against a purchase order and goods receipt"
        actions={<Button onClick={() => navigate('/finance/bills')}>Cancel</Button>}
      />

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="General" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Bill Number" value="BILL-2026-0513 (auto)" disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Supplier" value={po.vendorName} disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="Purchase Order" value={poNumber} onChange={(e) => { setPoNumber(e.target.value); setGrnNumber('—'); }}>
                  {purchaseOrders.map((p) => (
                    <MenuItem key={p.id} value={p.poNumber}>{p.poNumber} — {p.vendorName}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="GRN Reference" value={grnNumber} onChange={(e) => setGrnNumber(e.target.value)}>
                  <MenuItem value="—">Not yet received</MenuItem>
                  {relatedGrns.map((g) => (
                    <MenuItem key={g.id} value={g.grnNumber}>{g.grnNumber}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth type="date" label="Invoice Date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth type="date" label="Due Date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Products" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Unit Cost</TableCell>
                  <TableCell align="right">VAT</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((l, i) => {
                  const base = l.quantity * l.unitCost;
                  const total = base + (base * l.vat) / 100;
                  return (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{l.product}</TableCell>
                      <TableCell>{l.batchNumber}</TableCell>
                      <TableCell align="right">{l.quantity.toLocaleString()}</TableCell>
                      <TableCell align="right">NPR {l.unitCost}</TableCell>
                      <TableCell align="right">{l.vat}%</TableCell>
                      <TableCell align="right">NPR {total.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardHeader title="Verification" slotProps={{ title: { variant: 'subtitle2' } }} />
              <CardContent sx={{ pt: 0 }}>
                <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" color={grnNumber !== '—' ? 'success' : 'default'} label={grnNumber !== '—' ? 'GRN Matched' : 'Awaiting GRN'} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardHeader title="Payment" slotProps={{ title: { variant: 'subtitle2' } }} />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={1}>
                  <Typography variant="body2">Outstanding Amount: <strong>NPR {amount.toFixed(2)}</strong></Typography>
                  <Typography variant="body2">Due Date: {dueDate || '—'}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" onClick={() => navigate('/finance/bills')}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Record Bill</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
