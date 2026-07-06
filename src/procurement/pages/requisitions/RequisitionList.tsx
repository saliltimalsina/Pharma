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
import type { RequisitionStatus, Priority } from '../../data/types';

const statuses: RequisitionStatus[] = [
  'Draft',
  'Submitted',
  'Pending Approval',
  'Approved',
  'Rejected',
  'Cancelled',
  'Completed',
];
const priorities: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

const columns: GridColDef[] = [
  { field: 'requestNo', headerName: 'Request No.', flex: 1, minWidth: 150 },
  { field: 'department', headerName: 'Department', flex: 1, minWidth: 130 },
  { field: 'requestedBy', headerName: 'Requested By', flex: 1, minWidth: 140 },
  { field: 'requestDate', headerName: 'Request Date', flex: 1, minWidth: 120 },
  {
    field: 'priority',
    headerName: 'Priority',
    minWidth: 110,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  { field: 'itemCount', headerName: 'Items', width: 80, headerAlign: 'right', align: 'right' },
  {
    field: 'status',
    headerName: 'Status',
    minWidth: 150,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  { field: 'approvedBy', headerName: 'Approved By', flex: 1, minWidth: 130 },
];

export default function RequisitionList() {
  const navigate = useNavigate();
  const { requisitions } = useProcurement();
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');

  const rows = useMemo(
    () =>
      requisitions
        .filter((r) => department === 'All' || r.department === department)
        .filter((r) => status === 'All' || r.status === status)
        .filter((r) => priority === 'All' || r.priority === priority)
        .map((r) => ({
          id: r.id,
          requestNo: r.requestNo,
          department: r.department,
          requestedBy: r.requestedBy,
          requestDate: r.requestDate,
          priority: r.priority,
          itemCount: r.items.length,
          status: r.status,
          approvedBy: r.approvedBy ?? '—',
        })),
    [requisitions, department, status, priority],
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title="Material Requisition"
        subtitle="Departments request materials before purchasing takes over"
        actions={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => navigate('/procurement/requisitions/new')}
          >
            Create Requisition
          </Button>
        }
      />

      <FilterBar>
        <FilterSelect value={department} onChange={(e) => setDepartment(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="All">All Departments</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d} value={d}>{d}</MenuItem>
          ))}
        </FilterSelect>
        <FilterSelect value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="All">All Statuses</MenuItem>
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </FilterSelect>
        <FilterSelect value={priority} onChange={(e) => setPriority(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="All">All Priorities</MenuItem>
          {priorities.map((p) => (
            <MenuItem key={p} value={p}>{p}</MenuItem>
          ))}
        </FilterSelect>
      </FilterBar>

      <Card variant="outlined" sx={{ height: 560 }}>
        <ProcurementDataGrid
          rows={rows}
          columns={columns}
          onRowClick={(params) => navigate(`/procurement/requisitions/${params.id}`)}
          sx={{ cursor: 'pointer' }}
        />
      </Card>
    </Box>
  );
}
