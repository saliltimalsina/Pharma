import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import FormSelectField from '../../components/FormSelectField';
import { useFinance } from '../../store/FinanceStore';
import { customerById, invoiceBalance } from '../../data/mockData';

export default function CreditNoteForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { invoices, addCreditNote } = useFinance();

  // Credit notes only make sense against invoices with real outstanding balance.
  const openInvoices = useMemo(
    () => invoices.filter((i) => !['Draft', 'Proforma', 'Cancelled'].includes(i.status) && invoiceBalance(i) > 0),
    [invoices],
  );

  const [invoiceNo, setInvoiceNo] = useState(searchParams.get('invoice') ?? openInvoices[0]?.invoiceNo ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(0);

  const selected = invoices.find((i) => i.invoiceNo === invoiceNo);
  const outstanding = selected ? invoiceBalance(selected) : 0;
  const customer = selected ? customerById(selected.customerId) : undefined;
  const canSubmit = !!selected && amount > 0 && amount <= outstanding;

  const handleSubmit = () => {
    if (!selected) return;
    addCreditNote({
      date,
      customerId: selected.customerId,
      invoiceNo: selected.invoiceNo,
      reason,
      amount,
    });
    navigate('/finance/credit-notes');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1000px' } }}>
      <PageHeader
        title="Create Credit Note"
        subtitle="Reduce a customer invoice's outstanding balance and reverse the sale in the ledger"
        actions={<Button onClick={() => navigate('/finance/credit-notes')}>Cancel</Button>}
      />

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="Credit Note" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Credit Note Number" value="CN-2026 (auto)" disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="Invoice" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)}>
                  {openInvoices.length === 0 && <MenuItem value="">No open invoices</MenuItem>}
                  {openInvoices.map((i) => (
                    <MenuItem key={i.id} value={i.invoiceNo}>{i.invoiceNo} — {customerById(i.customerId)?.name}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Customer" value={customer?.name ?? ''} disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Outstanding Balance" value={`$${outstanding.toFixed(2)}`} disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth type="number" label="Credit Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormField fullWidth label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Returned goods, pricing correction" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {!canSubmit && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Enter a credit amount greater than zero and no more than the outstanding balance.
          </Typography>
        )}

        <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" onClick={() => navigate('/finance/credit-notes')}>Cancel</Button>
          <Button variant="contained" disabled={!canSubmit} onClick={handleSubmit}>Issue Credit Note</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
