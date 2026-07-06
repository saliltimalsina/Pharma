import { useParams, useNavigate } from 'react-router-dom';
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
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import LinearProgress from '@mui/material/LinearProgress';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import DetailTabs from '../../components/DetailTabs';
import { useProcurement } from '../../store/ProcurementStore';

function LabeledValue({ label, value }: { label: string; value?: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value || '—'}</Typography>
    </Box>
  );
}

const PO_STEPS = ['Draft', 'Approved', 'Sent', 'Receiving', 'Completed'];

export default function PODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { purchaseOrders, approvePurchaseOrder, sendPurchaseOrder } = useProcurement();
  const po = purchaseOrders.find((p) => p.id === id);

  if (!po) {
    return (
      <Box>
        <Typography>Purchase order not found.</Typography>
        <Button onClick={() => navigate('/procurement/purchase-orders')}>Back to list</Button>
      </Box>
    );
  }

  const activeStep =
    po.status === 'Draft' || po.status === 'Pending Approval'
      ? 0
      : po.status === 'Approved'
        ? 1
        : po.status === 'Sent'
          ? 2
          : po.status === 'Partially Received'
            ? 3
            : po.status === 'Completed'
              ? 4
              : 0;

  const lineTotal = (item: (typeof po.items)[number]) => {
    const base = item.qty * item.unitPrice;
    const discounted = base - (base * item.discount) / 100;
    return discounted + (discounted * item.vat) / 100;
  };

  const overviewTab = (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Order Information</Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="PO Number" value={po.poNumber} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Vendor" value={po.vendorName} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Currency" value={po.currency} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Date" value={po.date} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Expected Delivery" value={po.expectedDelivery} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Warehouse" value={po.warehouse} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Department" value={po.department} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Created By" value={po.createdBy} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Amount" value={`$${po.amount.toLocaleString()}`} /></Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Status</Typography>
            <StatusChip status={po.status} />
            <Box sx={{ mt: 3 }}>
              <Stepper activeStep={activeStep} orientation="vertical">
                {PO_STEPS.map((label) => (
                  <Step key={label}><StepLabel>{label}</StepLabel></Step>
                ))}
              </Stepper>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const itemsTab = (
    <Card variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell align="right">Unit Price</TableCell>
            <TableCell align="right">Discount</TableCell>
            <TableCell align="right">VAT</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {po.items.map((item, i) => (
            <TableRow key={i} hover>
              <TableCell sx={{ fontWeight: 500 }}>{item.product}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell align="right">{item.qty}</TableCell>
              <TableCell>{item.unit}</TableCell>
              <TableCell align="right">${item.unitPrice}</TableCell>
              <TableCell align="right">{item.discount}%</TableCell>
              <TableCell align="right">{item.vat}%</TableCell>
              <TableCell align="right">${lineTotal(item).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const receiptsTab = (
    <Card variant="outlined">
      <CardContent>
        {po.items.map((item, i) => {
          const received = item.receivedQty ?? 0;
          const pct = Math.min(100, Math.round((received / item.qty) * 100));
          return (
            <Box key={i} sx={{ mb: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{item.product}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{received} / {item.qty} {item.unit}</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={pct} color={pct === 100 ? 'success' : 'primary'} />
            </Box>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title={po.poNumber}
        subtitle={`${po.vendorName} · ${po.warehouse}`}
        actions={
          <>
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/procurement/purchase-orders')}>Back</Button>
            {po.status === 'Pending Approval' && (
              <Button variant="contained" color="success" onClick={() => approvePurchaseOrder(po.id)}>Approve</Button>
            )}
            {po.status === 'Approved' && (
              <Button variant="contained" onClick={() => sendPurchaseOrder(po.id)}>Send to Vendor</Button>
            )}
            {(po.status === 'Sent' || po.status === 'Partially Received') && (
              <Button variant="contained" onClick={() => navigate(`/procurement/grn/new?fromPo=${po.id}`)}>Receive Goods</Button>
            )}
          </>
        }
      />
      <DetailTabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          { label: 'Items', content: itemsTab },
          { label: 'Receipts', content: receiptsTab },
        ]}
      />
    </Box>
  );
}
