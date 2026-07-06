import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { GridColDef } from '@mui/x-data-grid';
import PageHeader from '../../components/PageHeader';
import FilterBar from '../../components/FilterBar';
import FilterSelect from '../../components/FilterSelect';
import StatusChip from '../../components/StatusChip';
import ProcurementDataGrid from '../../components/ProcurementDataGrid';
import { useProcurement } from '../../store/ProcurementStore';
import type { VendorCategory } from '../../data/types';

const categories: VendorCategory[] = ['API Supplier', 'Excipients', 'Packaging', 'Lab Equipment', 'Logistics', 'MRO'];

const columns: GridColDef[] = [
  {
    field: 'name',
    headerName: 'Vendor Name',
    flex: 1.4,
    minWidth: 220,
    renderCell: (params) => (
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.2, height: '100%' }}>
        <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: 'primary.main' }}>
          {params.value.charAt(0)}
        </Avatar>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{params.value}</Typography>
      </Stack>
    ),
  },
  { field: 'category', headerName: 'Category', flex: 1, minWidth: 130 },
  { field: 'phone', headerName: 'Phone', flex: 1, minWidth: 140 },
  { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 190 },
  {
    field: 'outstandingBalance',
    headerName: 'Outstanding Balance',
    minWidth: 160,
    headerAlign: 'right',
    align: 'right',
    valueFormatter: (value: number) => `$${value.toLocaleString()}`,
  },
  {
    field: 'status',
    headerName: 'Status',
    minWidth: 150,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
];

export default function VendorList() {
  const navigate = useNavigate();
  const { vendors } = useProcurement();
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [country, setCountry] = useState('All');

  const countries = useMemo(() => Array.from(new Set(vendors.map((v) => v.country))), [vendors]);

  const rows = useMemo(
    () =>
      vendors
        .filter((v) => category === 'All' || v.category === category)
        .filter((v) => status === 'All' || v.status === status)
        .filter((v) => country === 'All' || v.country === country)
        .map((v) => ({
          id: v.id,
          name: v.name,
          category: v.category,
          phone: v.phone,
          email: v.email,
          outstandingBalance: v.outstandingBalance,
          status: v.status,
        })),
    [vendors, category, status, country],
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title="Vendors"
        subtitle="Supplier database, performance and compliance"
        actions={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/procurement/vendors/new')}>
            Add Vendor
          </Button>
        }
      />

      <FilterBar>
        <FilterSelect value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 170 }}>
          <MenuItem value="All">All Categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </FilterSelect>
        <FilterSelect value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="All">All Statuses</MenuItem>
          {['Active', 'On Hold', 'Blacklisted', 'Pending Approval'].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </FilterSelect>
        <FilterSelect value={country} onChange={(e) => setCountry(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="All">All Countries</MenuItem>
          {countries.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </FilterSelect>
      </FilterBar>

      <Card variant="outlined" sx={{ height: 560 }}>
        <ProcurementDataGrid
          rows={rows}
          columns={columns}
          onRowClick={(params) => navigate(`/procurement/vendors/${params.id}`)}
          sx={{ cursor: 'pointer' }}
        />
      </Card>
    </Box>
  );
}
