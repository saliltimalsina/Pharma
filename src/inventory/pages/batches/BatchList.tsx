import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { GridColDef } from '@mui/x-data-grid';
import PageHeader from '../../components/PageHeader';
import FilterBar from '../../components/FilterBar';
import FilterSelect from '../../components/FilterSelect';
import StatusChip from '../../components/StatusChip';
import InventoryDataGrid from '../../components/InventoryDataGrid';
import { useInventory } from '../../store/InventoryStore';
import { itemById, warehouseById, warehouses } from '../../data/mockData';
import type { BatchStatus } from '../../data/types';

const statuses: BatchStatus[] = ['Available', 'Quarantined', 'Under Inspection', 'Released', 'Expired', 'Recalled'];

const columns: GridColDef[] = [
  { field: 'batchNumber', headerName: 'Batch Number', flex: 1, minWidth: 140 },
  { field: 'product', headerName: 'Product', flex: 1.3, minWidth: 200 },
  { field: 'warehouse', headerName: 'Warehouse', flex: 1, minWidth: 140 },
  { field: 'manufacturingDate', headerName: 'Manufacturing Date', flex: 1, minWidth: 150 },
  { field: 'expiryDate', headerName: 'Expiry Date', flex: 1, minWidth: 130 },
  {
    field: 'availableQty',
    headerName: 'Available Qty',
    minWidth: 120,
    headerAlign: 'right',
    align: 'right',
    valueFormatter: (value: number) => value.toLocaleString(),
  },
  {
    field: 'status',
    headerName: 'Status',
    minWidth: 140,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
];

export default function BatchList() {
  const navigate = useNavigate();
  const { batches } = useInventory();
  const [searchParams] = useSearchParams();
  const [warehouse, setWarehouse] = useState('All');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const rows = useMemo(
    () =>
      batches
        .filter((b) => warehouse === 'All' || b.warehouseId === warehouse)
        .filter((b) => status === 'All' || b.qcStatus === status)
        .filter((b) => search.trim() === '' || b.batchNumber.toLowerCase().includes(search.trim().toLowerCase()))
        .map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          product: itemById(b.itemId)?.name ?? '—',
          warehouse: warehouseById(b.warehouseId)?.name ?? '—',
          manufacturingDate: b.manufacturingDate,
          expiryDate: b.expiryDate,
          availableQty: b.availableQty,
          status: b.qcStatus,
        })),
    [batches, warehouse, status, search],
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title="Batch Management"
        subtitle="Every manufactured or purchased batch has its own identity"
        actions={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/inventory/batches/new')}>
            Create Batch
          </Button>
        }
      />

      <FilterBar>
        <TextField
          size="small"
          placeholder="Search batch number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FilterSelect value={warehouse} onChange={(e) => setWarehouse(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="All">All Warehouses</MenuItem>
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
          ))}
        </FilterSelect>
        <FilterSelect value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="All">All Statuses</MenuItem>
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </FilterSelect>
      </FilterBar>

      <Card variant="outlined" sx={{ height: 560 }}>
        <InventoryDataGrid
          rows={rows}
          columns={columns}
          onRowClick={(params) => navigate(`/inventory/batches/${params.id}`)}
          sx={{ cursor: 'pointer' }}
        />
      </Card>
    </Box>
  );
}
