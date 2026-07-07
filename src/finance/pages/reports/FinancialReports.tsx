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
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PageHeader from '../../components/PageHeader';
import DetailTabs from '../../components/DetailTabs';
import { useFinance } from '../../store/FinanceStore';
import { exportToCsv } from '../../../shared/exportCsv';
import { customers, customerById, invoiceBalance, billBalance } from '../../data/mockData';
import { vendors } from '../../../procurement/data/mockData';

function ExportBar({ onExport }: { onExport: () => void }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
      <Button size="small" startIcon={<FileDownloadRoundedIcon />} onClick={onExport}>Export</Button>
    </Stack>
  );
}

function AnalyticsRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="body2">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
    </Stack>
  );
}

export default function FinancialReports() {
  const { invoices, supplierBills, chartOfAccounts, payments, journalEntries } = useFinance();

  const revenue = chartOfAccounts.find((a) => a.code === '4000')?.balance ?? 0;
  const cogs = chartOfAccounts.find((a) => a.code === '5000')?.balance ?? 0;
  const opex = chartOfAccounts.find((a) => a.code === '5100')?.balance ?? 0;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - opex;

  // Proforma invoices are not real sales and do not count toward AR/outstanding.
  const salesByCustomer = customers.map((c) => {
    const custInvoices = invoices.filter((i) => i.customerId === c.id && !['Proforma', 'Cancelled'].includes(i.status));
    return {
      id: c.id,
      name: c.name,
      invoiced: custInvoices.reduce((s, i) => s + i.amount, 0),
      outstanding: custInvoices.reduce((s, i) => s + invoiceBalance(i), 0),
    };
  });

  const purchasesBySupplier = vendors.map((v) => {
    const vendorBills = supplierBills.filter((b) => b.vendorId === v.id && b.status !== 'Cancelled');
    return {
      id: v.id,
      name: v.name,
      billed: vendorBills.reduce((s, b) => s + b.amount, 0),
      outstanding: vendorBills.reduce((s, b) => s + billBalance(b), 0),
    };
  });

  const overdueInvoices = invoices.filter((i) => i.status === 'Overdue');

  // Cash flow statement — operating activity by month, derived from real records:
  // customer payments in, supplier payments/refunds and expense-paid journals out.
  const bankCashNames = new Set(
    chartOfAccounts.filter((a) => a.type === 'Asset' && (a.name.includes('Bank') || a.name === 'Cash on Hand')).map((a) => a.name),
  );
  const expenseNames = new Set(chartOfAccounts.filter((a) => a.type === 'Expense').map((a) => a.name));
  const cashFlowMap = new Map<string, { inflow: number; outflow: number }>();
  const bumpCashFlow = (month: string, key: 'inflow' | 'outflow', amt: number) => {
    const cur = cashFlowMap.get(month) ?? { inflow: 0, outflow: 0 };
    cur[key] += amt;
    cashFlowMap.set(month, cur);
  };
  payments.forEach((p) => {
    const month = p.date.slice(0, 7);
    if (p.type === 'Customer Payment') bumpCashFlow(month, 'inflow', p.amount);
    else if (p.type === 'Supplier Payment' || p.type === 'Refund') bumpCashFlow(month, 'outflow', p.amount);
  });
  journalEntries.forEach((j) => {
    if (expenseNames.has(j.debitAccount) && bankCashNames.has(j.creditAccount)) {
      bumpCashFlow(j.date.slice(0, 7), 'outflow', j.amount);
    }
  });
  const cashFlowRows = [...cashFlowMap.entries()]
    .map(([month, v]) => ({ month, inflow: v.inflow, outflow: v.outflow, net: v.inflow - v.outflow }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const totalInflow = cashFlowRows.reduce((s, r) => s + r.inflow, 0);
  const totalOutflow = cashFlowRows.reduce((s, r) => s + r.outflow, 0);
  const netCashChange = totalInflow - totalOutflow;

  const exportTrialBalance = () =>
    exportToCsv(
      'trial-balance',
      [
        { header: 'Account', accessor: (a) => a.name },
        { header: 'Type', accessor: (a) => a.type },
        { header: 'Debit', accessor: (a) => (['Asset', 'Expense'].includes(a.type) ? a.balance : '') },
        { header: 'Credit', accessor: (a) => (['Liability', 'Equity', 'Revenue'].includes(a.type) ? a.balance : '') },
      ],
      chartOfAccounts,
    );

  const exportSalesByCustomer = () =>
    exportToCsv(
      'sales-by-customer',
      [
        { header: 'Customer', accessor: (r) => r.name },
        { header: 'Invoiced', accessor: (r) => r.invoiced },
        { header: 'Outstanding', accessor: (r) => r.outstanding },
      ],
      salesByCustomer,
    );

  const exportPurchasesBySupplier = () =>
    exportToCsv(
      'purchases-by-supplier',
      [
        { header: 'Supplier', accessor: (r) => r.name },
        { header: 'Billed', accessor: (r) => r.billed },
        { header: 'Outstanding', accessor: (r) => r.outstanding },
      ],
      purchasesBySupplier,
    );

  const exportOverdue = () =>
    exportToCsv(
      'overdue-customers',
      [
        { header: 'Customer', accessor: (i) => customerById(i.customerId)?.name ?? '—' },
        { header: 'Invoice', accessor: (i) => i.invoiceNo },
        { header: 'Amount', accessor: (i) => invoiceBalance(i) },
      ],
      overdueInvoices,
    );

  const exportCashFlow = () =>
    exportToCsv(
      'cash-flow-statement',
      [
        { header: 'Period', accessor: (r) => r.month },
        { header: 'Operating Inflows', accessor: (r) => r.inflow },
        { header: 'Operating Outflows', accessor: (r) => r.outflow },
        { header: 'Net Change', accessor: (r) => r.net },
      ],
      cashFlowRows,
    );

  const coreTab = (
    <Stack spacing={2}>
      <ExportBar onExport={exportTrialBalance} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Trial Balance</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow><TableCell>Account</TableCell><TableCell align="right">Debit</TableCell><TableCell align="right">Credit</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {chartOfAccounts.map((a) => (
                    <TableRow key={a.code} hover>
                      <TableCell>{a.name}</TableCell>
                      <TableCell align="right">{['Asset', 'Expense'].includes(a.type) ? `NPR ${a.balance.toLocaleString()}` : '—'}</TableCell>
                      <TableCell align="right">{['Liability', 'Equity', 'Revenue'].includes(a.type) ? `NPR ${a.balance.toLocaleString()}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Profit &amp; Loss</Typography>
              <AnalyticsRow label="Revenue" value={`NPR ${revenue.toLocaleString()}`} />
              <AnalyticsRow label="Cost of Goods Sold" value={`-NPR ${cogs.toLocaleString()}`} />
              <AnalyticsRow label="Gross Profit" value={`NPR ${grossProfit.toLocaleString()}`} />
              <AnalyticsRow label="Operating Expenses" value={`-NPR ${opex.toLocaleString()}`} />
              <AnalyticsRow label="Net Profit" value={`NPR ${netProfit.toLocaleString()}`} />
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Balance Sheet (summary)</Typography>
              <AnalyticsRow label="Total Assets" value={`NPR ${chartOfAccounts.filter((a) => a.type === 'Asset').reduce((s, a) => s + a.balance, 0).toLocaleString()}`} />
              <AnalyticsRow label="Total Liabilities" value={`NPR ${chartOfAccounts.filter((a) => a.type === 'Liability').reduce((s, a) => s + a.balance, 0).toLocaleString()}`} />
              <AnalyticsRow label="Total Equity" value={`NPR ${chartOfAccounts.filter((a) => a.type === 'Equity').reduce((s, a) => s + a.balance, 0).toLocaleString()}`} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );

  const salesTab = (
    <Stack spacing={2}>
      <ExportBar onExport={exportSalesByCustomer} />
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Sales by Customer</Typography>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>Customer</TableCell><TableCell align="right">Invoiced</TableCell><TableCell align="right">Outstanding</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {salesByCustomer.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{c.name}</TableCell>
                  <TableCell align="right">NPR {c.invoiced.toLocaleString()}</TableCell>
                  <TableCell align="right">NPR {c.outstanding.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Sales by Product</Typography>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>Product</TableCell><TableCell align="right">Units Sold</TableCell><TableCell align="right">Revenue</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {['Paracetamol 500mg Tablets', 'Ibuprofen 400mg Tablets', 'Metformin 500mg Tablets'].map((p) => {
                const qty = invoices.flatMap((i) => i.lines).filter((l) => l.product === p).reduce((s, l) => s + l.quantity, 0);
                const rev = invoices.flatMap((i) => i.lines).filter((l) => l.product === p).reduce((s, l) => s + l.quantity * l.unitPrice, 0);
                return (
                  <TableRow key={p} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{p}</TableCell>
                    <TableCell align="right">{qty.toLocaleString()}</TableCell>
                    <TableCell align="right">NPR {rev.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );

  const purchaseTab = (
    <Stack spacing={2}>
      <ExportBar onExport={exportPurchasesBySupplier} />
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Purchases by Supplier</Typography>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>Supplier</TableCell><TableCell align="right">Billed</TableCell><TableCell align="right">Outstanding</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {purchasesBySupplier.map((v) => (
                <TableRow key={v.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{v.name}</TableCell>
                  <TableCell align="right">NPR {v.billed.toLocaleString()}</TableCell>
                  <TableCell align="right">NPR {v.outstanding.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );

  const outstandingTab = (
    <Stack spacing={2}>
      <ExportBar onExport={exportOverdue} />
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Overdue Customers</Typography>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>Customer</TableCell><TableCell>Invoice</TableCell><TableCell align="right">Amount</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {overdueInvoices.map((i) => (
                <TableRow key={i.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{customerById(i.customerId)?.name}</TableCell>
                  <TableCell>{i.invoiceNo}</TableCell>
                  <TableCell align="right">NPR {invoiceBalance(i).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {overdueInvoices.length === 0 && (
                <TableRow><TableCell colSpan={3} align="center" sx={{ color: 'text.secondary' }}>No overdue customers</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );

  const cashFlowTab = (
    <Stack spacing={2}>
      <ExportBar onExport={exportCashFlow} />
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Cash Flow Statement — Operating Activities</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell align="right">Operating Inflows</TableCell>
                <TableCell align="right">Operating Outflows</TableCell>
                <TableCell align="right">Net Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cashFlowRows.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>No cash movements</TableCell></TableRow>
              )}
              {cashFlowRows.map((r) => (
                <TableRow key={r.month} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{r.month}</TableCell>
                  <TableCell align="right">NPR {r.inflow.toLocaleString()}</TableCell>
                  <TableCell align="right">NPR {r.outflow.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{r.net < 0 ? '-' : ''}${Math.abs(r.net).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {cashFlowRows.length > 0 && (
              <TableBody>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>NPR {totalInflow.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>NPR {totalOutflow.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{netCashChange < 0 ? '-' : ''}${Math.abs(netCashChange).toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title="Financial Reports"
        subtitle="Date filters, export PDF/Excel, print and comparison periods on every report"
      />
      <DetailTabs
        tabs={[
          { label: 'Core Reports', content: coreTab },
          { label: 'Sales Reports', content: salesTab },
          { label: 'Purchase Reports', content: purchaseTab },
          { label: 'Cash Flow', content: cashFlowTab },
          { label: 'Outstanding', content: outstandingTab },
        ]}
      />
    </Box>
  );
}
