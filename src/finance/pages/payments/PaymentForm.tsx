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
import Typography from '@mui/material/Typography';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import FormSelectField from '../../components/FormSelectField';
import { useFinance } from '../../store/FinanceStore';
import { customerById } from '../../data/mockData';
import type { PaymentMethod, PaymentType } from '../../data/types';

const types: PaymentType[] = ['Customer Payment', 'Supplier Payment'];
const methods: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Cheque', 'Credit Card', 'Online Payment', 'Mobile Wallet'];
const banks = ['Nepal Investment Bank', 'Standard Chartered Nepal', '—'];

export default function PaymentForm() {
  const navigate = useNavigate();
  const { invoices, supplierBills, addPayment } = useFinance();

  const [type, setType] = useState<PaymentType>('Customer Payment');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const openInvoices = useMemo(() => invoices.filter((i) => i.amount - i.paid > 0 && i.status !== 'Draft'), [invoices]);
  const openBills = useMemo(() => supplierBills.filter((b) => b.amount - b.paid > 0 && b.status !== 'Draft'), [supplierBills]);

  const [invoiceRef, setInvoiceRef] = useState(openInvoices[0]?.invoiceNo ?? '');
  const [billRef, setBillRef] = useState(openBills[0]?.billNo ?? '');
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>('Bank Transfer');
  const [bank, setBank] = useState(banks[0]);
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const isCustomer = type === 'Customer Payment';
  const selectedInvoice = openInvoices.find((i) => i.invoiceNo === invoiceRef);
  const selectedBill = openBills.find((b) => b.billNo === billRef);
  const partyName = isCustomer
    ? (selectedInvoice ? customerById(selectedInvoice.customerId)?.name : '') ?? ''
    : selectedBill?.vendorName ?? '';
  const outstandingBalance = isCustomer
    ? (selectedInvoice ? selectedInvoice.amount - selectedInvoice.paid : 0)
    : (selectedBill ? selectedBill.amount - selectedBill.paid : 0);
  const remainingBalance = outstandingBalance - amount;

  const canSubmit = amount > 0 && (isCustomer ? !!selectedInvoice : !!selectedBill);

  const handleSubmit = () => {
    const id = addPayment({
      date,
      type,
      partyName,
      invoiceOrBillRef: isCustomer ? invoiceRef : billRef,
      method,
      outstandingBalance,
      amount,
      bank,
      referenceNumber: '',
      transactionId,
      notes,
    });
    navigate(`/finance/payments/${id}`);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1200px' } }}>
      <PageHeader
        title="Record Payment"
        subtitle="Allocate an incoming or outgoing payment against an open invoice or bill"
        actions={<Button onClick={() => navigate('/finance/payments')}>Cancel</Button>}
      />

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="General" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Payment Number" value="PAY-2026-3302 (auto)" disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="Payment Type" value={type} onChange={(e) => setType(e.target.value as PaymentType)}>
                  {types.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Allocation" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                {isCustomer ? (
                  <FormSelectField fullWidth label="Invoice" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)}>
                    {openInvoices.map((i) => (
                      <MenuItem key={i.id} value={i.invoiceNo}>{i.invoiceNo} — {customerById(i.customerId)?.name}</MenuItem>
                    ))}
                  </FormSelectField>
                ) : (
                  <FormSelectField fullWidth label="Bill" value={billRef} onChange={(e) => setBillRef(e.target.value)}>
                    {openBills.map((b) => (
                      <MenuItem key={b.id} value={b.billNo}>{b.billNo} — {b.vendorName}</MenuItem>
                    ))}
                  </FormSelectField>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField fullWidth label={isCustomer ? 'Customer' : 'Supplier'} value={partyName} disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Outstanding Balance" value={`$${outstandingBalance.toFixed(2)}`} disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth type="number" label="Paid Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Remaining Balance" value={`$${remainingBalance.toFixed(2)}`} disabled />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Bank Details" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="Method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {methods.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="Bank" value={bank} onChange={(e) => setBank(e.target.value)}>
                  {banks.map((b) => (
                    <MenuItem key={b} value={b}>{b}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Transaction ID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormField fullWidth multiline minRows={2} label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {!canSubmit && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Enter a paid amount greater than zero against an open {isCustomer ? 'invoice' : 'bill'} to continue.
          </Typography>
        )}

        <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" onClick={() => navigate('/finance/payments')}>Cancel</Button>
          <Button variant="contained" disabled={!canSubmit} onClick={handleSubmit}>Record Payment</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
