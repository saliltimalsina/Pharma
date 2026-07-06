import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import DetailTabs from '../../components/DetailTabs';
import { useFinance } from '../../store/FinanceStore';
import { customerById } from '../../data/mockData';

function lineVat(base: number, vat: number) {
  return (base * vat) / 100;
}

export default function TaxesHub() {
  const { invoices, supplierBills } = useFinance();

  const vatCollected = invoices.reduce(
    (sum, inv) =>
      sum +
      inv.lines.reduce((s, l) => {
        const base = l.quantity * l.unitPrice * (1 - l.discount / 100);
        return s + lineVat(base, l.vat);
      }, 0),
    0,
  );
  const vatPaid = supplierBills.reduce(
    (sum, b) => sum + b.lines.reduce((s, l) => s + lineVat(l.quantity * l.unitCost, l.vat), 0),
    0,
  );
  const taxPayable = vatCollected - vatPaid;

  const kpis = [
    { title: 'VAT Collected', value: `$${vatCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <ReceiptRoundedIcon />, color: 'success' as const },
    { title: 'VAT Paid', value: `$${vatPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <PaidRoundedIcon />, color: 'primary' as const },
    { title: 'Tax Payable', value: `${taxPayable < 0 ? '-' : ''}$${Math.abs(taxPayable).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <AccountBalanceWalletRoundedIcon />, color: 'warning' as const },
  ];

  const purchaseVatTab = (
    <Card variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Supplier</TableCell>
            <TableCell>Invoice</TableCell>
            <TableCell align="right">VAT Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {supplierBills.map((b) => {
            const vat = b.lines.reduce((s, l) => s + lineVat(l.quantity * l.unitCost, l.vat), 0);
            return (
              <TableRow key={b.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{b.vendorName}</TableCell>
                <TableCell>{b.billNo}</TableCell>
                <TableCell align="right">${vat.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  const salesVatTab = (
    <Card variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Customer</TableCell>
            <TableCell>Invoice</TableCell>
            <TableCell align="right">VAT Amount</TableCell>
            <TableCell align="right">Collected VAT</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.filter((i) => i.lines.length > 0).map((i) => {
            const vat = i.lines.reduce((s, l) => {
              const base = l.quantity * l.unitPrice * (1 - l.discount / 100);
              return s + lineVat(base, l.vat);
            }, 0);
            return (
              <TableRow key={i.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{customerById(i.customerId)?.name}</TableCell>
                <TableCell>{i.invoiceNo}</TableCell>
                <TableCell align="right">${vat.toFixed(2)}</TableCell>
                <TableCell align="right">${(i.status === 'Paid' || i.status === 'Partially Paid' ? vat : 0).toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader title="Taxes" subtitle="Automate VAT and tax reporting" />

      <Grid container spacing={2} columns={12} sx={{ mb: 3 }}>
        {kpis.map((kpi) => (
          <Grid key={kpi.title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <KpiCard {...kpi} />
          </Grid>
        ))}
      </Grid>

      <DetailTabs
        tabs={[
          { label: 'Purchase VAT', content: purchaseVatTab },
          { label: 'Sales VAT', content: salesVatTab },
        ]}
      />
    </Box>
  );
}
