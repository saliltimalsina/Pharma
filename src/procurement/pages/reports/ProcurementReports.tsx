import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PageHeader from '../../components/PageHeader';
import { useProcurement } from '../../store/ProcurementStore';
import { exportToCsv } from '../../../shared/exportCsv';

function PendingTable({
  title,
  rows,
  onClick,
}: {
  title: string;
  rows: { id: string; a: string; b: string; c: string }[];
  onClick: (id: string) => void;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>{title}</Typography>
        <Table size="small">
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => onClick(r.id)}>
                <TableCell sx={{ fontWeight: 500 }}>{r.a}</TableCell>
                <TableCell>{r.b}</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>{r.c}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell sx={{ color: 'text.secondary' }}>Nothing pending</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function ProcurementReports() {
  const navigate = useNavigate();
  const { requisitions, rfqs, purchaseOrders, grns } = useProcurement();

  const exportPurchases = () =>
    exportToCsv(
      'purchase-orders',
      [
        { header: 'PO Number', accessor: (p) => p.poNumber },
        { header: 'Vendor', accessor: (p) => p.vendorName },
        { header: 'Date', accessor: (p) => p.date },
        { header: 'Expected Delivery', accessor: (p) => p.expectedDelivery },
        { header: 'Department', accessor: (p) => p.department },
        { header: 'Amount', accessor: (p) => p.amount },
        { header: 'Status', accessor: (p) => p.status },
      ],
      purchaseOrders,
    );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title="Procurement Reports"
        subtitle="Live pending items across procurement, derived from current data"
        actions={
          <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={exportPurchases}>
            Export Purchase Orders (CSV)
          </Button>
        }
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <PendingTable
            title="Pending Requisitions"
            rows={requisitions.filter((r) => ['Submitted', 'Pending Approval', 'Draft'].includes(r.status)).map((r) => ({ id: r.id, a: r.requestNo, b: r.department, c: r.status }))}
            onClick={(id) => navigate(`/procurement/requisitions/${id}`)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PendingTable
            title="Pending RFQs"
            rows={rfqs.filter((r) => ['Sent', 'Receiving Quotes'].includes(r.status)).map((r) => ({ id: r.id, a: r.rfqNo, b: r.title, c: r.status }))}
            onClick={(id) => navigate(`/procurement/rfqs/${id}`)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PendingTable
            title="Pending Purchase Orders"
            rows={purchaseOrders.filter((p) => ['Pending Approval', 'Draft'].includes(p.status)).map((p) => ({ id: p.id, a: p.poNumber, b: p.vendorName, c: p.status }))}
            onClick={(id) => navigate(`/procurement/purchase-orders/${id}`)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PendingTable
            title="Pending Deliveries"
            rows={grns.filter((g) => ['Pending', 'Inspection'].includes(g.status)).map((g) => ({ id: g.id, a: g.grnNumber, b: g.vendorName, c: g.status }))}
            onClick={(id) => navigate(`/procurement/grn/${id}`)}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
