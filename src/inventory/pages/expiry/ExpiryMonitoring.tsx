import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import { GridColDef } from '@mui/x-data-grid';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import InventoryDataGrid from '../../components/InventoryDataGrid';
import { ExpiryChip, daysUntil } from '../../components/expiryUtils';
import { useInventory } from '../../store/InventoryStore';
import { itemById, warehouseById } from '../../data/mockData';
import { exportToCsv } from '../../../shared/exportCsv';

function RowActions({ batchId }: { batchId: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();
  const { recallBatch, disposeBatch } = useInventory();
  return (
    <>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
        <MoreVertRoundedIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { navigate('/inventory/transfers/new'); setAnchor(null); }}>Transfer</MenuItem>
        <MenuItem onClick={() => { recallBatch(batchId); setAnchor(null); }}>Recall</MenuItem>
        <MenuItem onClick={() => { disposeBatch(batchId); setAnchor(null); }}>Dispose</MenuItem>
      </Menu>
    </>
  );
}

const columns: GridColDef[] = [
  { field: 'product', headerName: 'Product', flex: 1.3, minWidth: 200 },
  { field: 'batchNumber', headerName: 'Batch', flex: 0.8, minWidth: 120 },
  { field: 'warehouse', headerName: 'Warehouse', flex: 1, minWidth: 140 },
  {
    field: 'availableQty',
    headerName: 'Available Qty',
    minWidth: 120,
    headerAlign: 'right',
    align: 'right',
    valueFormatter: (value: number) => value.toLocaleString(),
  },
  { field: 'expiryDate', headerName: 'Expiry Date', flex: 1, minWidth: 130 },
  { field: 'daysRemaining', headerName: 'Days Remaining', minWidth: 130, headerAlign: 'right', align: 'right' },
  {
    field: 'status',
    headerName: 'Status',
    minWidth: 130,
    renderCell: (params) => <ExpiryChip dateStr={params.row.expiryDate} />,
  },
  {
    field: 'actions',
    headerName: '',
    width: 60,
    sortable: false,
    filterable: false,
    renderCell: (params) => <RowActions batchId={params.id as string} />,
  },
];

export default function ExpiryMonitoring() {
  const navigate = useNavigate();
  const { batches } = useInventory();

  const rows = useMemo(
    () =>
      batches
        .map((b) => ({
          id: b.id,
          product: itemById(b.itemId)?.name ?? '—',
          batchNumber: b.batchNumber,
          warehouse: warehouseById(b.warehouseId)?.name ?? '—',
          availableQty: b.availableQty,
          expiryDate: b.expiryDate,
          daysRemaining: daysUntil(b.expiryDate),
        }))
        .sort((a, b) => a.daysRemaining - b.daysRemaining),
    [batches],
  );

  const handleExport = () => {
    exportToCsv(
      'expiry-monitoring',
      [
        { header: 'Product', accessor: (r) => r.product },
        { header: 'Batch', accessor: (r) => r.batchNumber },
        { header: 'Warehouse', accessor: (r) => r.warehouse },
        { header: 'Available Qty', accessor: (r) => r.availableQty },
        { header: 'Expiry Date', accessor: (r) => r.expiryDate },
        { header: 'Days Remaining', accessor: (r) => r.daysRemaining },
      ],
      rows,
    );
  };

  const expiredToday = rows.filter((r) => r.daysRemaining < 0).length;
  const expiring7 = rows.filter((r) => r.daysRemaining >= 0 && r.daysRemaining <= 7).length;
  const expiring30 = rows.filter((r) => r.daysRemaining >= 0 && r.daysRemaining <= 30).length;
  const expiring90 = rows.filter((r) => r.daysRemaining >= 0 && r.daysRemaining <= 90).length;
  const onHold = batches.filter((b) => b.qcStatus === 'Quarantined' || b.qcStatus === 'Recalled').length;

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title="Expiry Monitoring"
        subtitle="Catch expiring pharmaceutical stock before it becomes a loss"
        actions={<Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={handleExport}>Print Report</Button>}
      />

      <Grid container spacing={2} columns={12} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <KpiCard title="Expired Today" value={`${expiredToday}`} icon={<EventBusyRoundedIcon />} color="error" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <KpiCard title="Expiring in 7 Days" value={`${expiring7}`} icon={<EventBusyRoundedIcon />} color="error" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <KpiCard title="Expiring in 30 Days" value={`${expiring30}`} icon={<EventBusyRoundedIcon />} color="warning" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <KpiCard title="Expiring in 90 Days" value={`${expiring90}`} icon={<EventBusyRoundedIcon />} color="warning" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
          <KpiCard title="Products on Hold" value={`${onHold}`} icon={<EventBusyRoundedIcon />} color="info" />
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ height: 500 }}>
        <InventoryDataGrid
          rows={rows}
          columns={columns}
          onRowClick={(params) => navigate(`/inventory/stock/${params.id}`)}
          sx={{ cursor: 'pointer' }}
        />
      </Card>
    </Box>
  );
}
