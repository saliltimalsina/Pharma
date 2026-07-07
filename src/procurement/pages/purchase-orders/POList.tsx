import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { GridColDef } from '@mui/x-data-grid';
import PageHeader from '../../components/PageHeader';
import FilterBar from '../../components/FilterBar';
import FilterSelect from '../../components/FilterSelect';
import StatusChip from '../../components/StatusChip';
import ProcurementDataGrid from '../../components/ProcurementDataGrid';
import { useProcurement } from '../../store/ProcurementStore';
import { departments } from '../../data/mockData';
import type { PoStatus } from '../../data/types';

const statuses: PoStatus[] = ['Draft', 'Pending Approval', 'Approved', 'Sent', 'Partially Received', 'Completed', 'Cancelled'];

const columns: GridColDef[] = [
  { field: 'poNumber', headerName: 'PO Number', flex: 1, minWidth: 150 },
  { field: 'vendorName', headerName: 'Vendor', flex: 1.2, minWidth: 190 },
  { field: 'date', headerName: 'Date', flex: 1, minWidth: 110 },
  { field: 'expectedDelivery', headerName: 'Expected Delivery', flex: 1, minWidth: 140 },
  {
    field: 'amount',
    headerName: 'Amount',
    minWidth: 130,
    headerAlign: 'right',
    align: 'right',
    valueFormatter: (value: number) => `NPR ${value.toLocaleString()}`,
  },
  {
    field: 'status',
    headerName: 'Status',
    minWidth: 160,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  { field: 'createdBy', headerName: 'Created By', flex: 1, minWidth: 130 },
];

export default function POList() {
  const navigate = useNavigate();
  const { vendors, purchaseOrders } = useProcurement();
  const [vendor, setVendor] = useState('All');
  const [status, setStatus] = useState('All');
  const [department, setDepartment] = useState('All');

  const rows = useMemo(
    () =>
      purchaseOrders
        .filter((p) => vendor === 'All' || p.vendorId === vendor)
        .filter((p) => status === 'All' || p.status === status)
        .filter((p) => department === 'All' || p.department === department)
        .map((p) => ({
          id: p.id,
          poNumber: p.poNumber,
          vendorName: p.vendorName,
          date: p.date,
          expectedDelivery: p.expectedDelivery,
          amount: p.amount,
          status: p.status,
          createdBy: p.createdBy,
        })),
    [purchaseOrders, vendor, status, department],
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title="Purchase Orders"
        subtitle="Official purchasing contracts issued to vendors"
        actions={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/procurement/purchase-orders/new')}>
            Create Purchase Order
          </Button>
        }
      />

      <FilterBar>
        <FilterSelect value={vendor} onChange={(e) => setVendor(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="All">All Vendors</MenuItem>
          {vendors.map((v) => (
            <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
          ))}
        </FilterSelect>
        <FilterSelect value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 170 }}>
          <MenuItem value="All">All Statuses</MenuItem>
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </FilterSelect>
        <FilterSelect value={department} onChange={(e) => setDepartment(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="All">All Departments</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d} value={d}>{d}</MenuItem>
          ))}
        </FilterSelect>
      </FilterBar>

      <Card variant="outlined" sx={{ height: 560 }}>
        <ProcurementDataGrid
          rows={rows}
          columns={columns}
          onRowClick={(params) => navigate(`/procurement/purchase-orders/${params.id}`)}
          sx={{ cursor: 'pointer' }}
        />
      </Card>
    </Box>
  );
}
