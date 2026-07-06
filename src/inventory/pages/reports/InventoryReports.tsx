import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PageHeader from '../../components/PageHeader';
import FilterBar from '../../components/FilterBar';
import FilterSelect from '../../components/FilterSelect';
import DetailTabs from '../../components/DetailTabs';
import { ExpiryChip, daysUntil, expirySeverity } from '../../components/expiryUtils';
import { useInventory } from '../../store/InventoryStore';
import { warehouses, itemById, warehouseById } from '../../data/mockData';
import { exportToCsv } from '../../../shared/exportCsv';

function ExportBar({ onExport }: { onExport: () => void }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
      <Button size="small" startIcon={<FileDownloadRoundedIcon />} onClick={onExport}>Export</Button>
    </Stack>
  );
}

export default function InventoryReports() {
  const { items, batches } = useInventory();
  const expirySorted = [...batches].sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate));

  const stockTab = (
    <Stack spacing={2}>
      <FilterBar>
        <FilterSelect defaultValue="all" sx={{ minWidth: 180 }}>
          <MenuItem value="all">All Warehouses</MenuItem>
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
          ))}
        </FilterSelect>
      </FilterBar>
      <ExportBar
        onExport={() =>
          exportToCsv(
            'stock-report',
            [
              { header: 'Product', accessor: (it) => it.name },
              { header: 'Category', accessor: (it) => it.category },
              { header: 'Available', accessor: (it) => batches.filter((b) => b.itemId === it.id).reduce((s, b) => s + b.availableQty, 0) },
              { header: 'Reserved', accessor: (it) => batches.filter((b) => b.itemId === it.id).reduce((s, b) => s + b.reservedQty, 0) },
              { header: 'Valuation', accessor: (it) => Math.round(batches.filter((b) => b.itemId === it.id).reduce((s, b) => s + b.availableQty, 0) * it.averageCost) },
            ],
            items,
          )
        }
      />
      <Card variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Available</TableCell>
              <TableCell align="right">Reserved</TableCell>
              <TableCell align="right">Valuation</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it) => {
              const itemBatches = batches.filter((b) => b.itemId === it.id);
              const available = itemBatches.reduce((s, b) => s + b.availableQty, 0);
              const reserved = itemBatches.reduce((s, b) => s + b.reservedQty, 0);
              return (
                <TableRow key={it.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{it.name}</TableCell>
                  <TableCell>{it.category}</TableCell>
                  <TableCell align="right">{available.toLocaleString()}</TableCell>
                  <TableCell align="right">{reserved.toLocaleString()}</TableCell>
                  <TableCell align="right">${Math.round(available * it.averageCost).toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );

  const movementTab = (
    <Stack spacing={2}>
      <ExportBar
        onExport={() =>
          exportToCsv(
            'movement-report',
            [
              { header: 'Batch', accessor: (b) => b.batchNumber },
              { header: 'Product', accessor: (b) => itemById(b.itemId)?.name ?? '' },
              { header: 'Warehouse', accessor: (b) => warehouseById(b.warehouseId)?.name ?? '' },
              { header: 'Received Qty', accessor: (b) => b.receivedQty },
              { header: 'Source', accessor: (b) => b.grnNumber },
            ],
            batches,
          )
        }
      />
      <Card variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Batch</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Warehouse</TableCell>
              <TableCell align="right">Received Qty</TableCell>
              <TableCell>Source</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{b.batchNumber}</TableCell>
                <TableCell>{itemById(b.itemId)?.name}</TableCell>
                <TableCell>{warehouseById(b.warehouseId)?.name}</TableCell>
                <TableCell align="right">{b.receivedQty.toLocaleString()}</TableCell>
                <TableCell>{b.grnNumber}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );

  const batchTab = (
    <Stack spacing={2}>
      <ExportBar
        onExport={() =>
          exportToCsv(
            'batch-report',
            [
              { header: 'Batch', accessor: (b) => b.batchNumber },
              { header: 'Product', accessor: (b) => itemById(b.itemId)?.name ?? '' },
              { header: 'Supplier', accessor: (b) => b.supplierName },
              { header: 'Mfg Date', accessor: (b) => b.manufacturingDate },
              { header: 'Expiry', accessor: (b) => b.expiryDate },
              { header: 'Valuation', accessor: (b) => { const it = itemById(b.itemId); return it ? Math.round(it.averageCost * b.availableQty) : 0; } },
            ],
            batches,
          )
        }
      />
      <Card variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Batch</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Mfg Date</TableCell>
              <TableCell>Expiry</TableCell>
              <TableCell align="right">Valuation</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.map((b) => {
              const item = itemById(b.itemId);
              return (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{b.batchNumber}</TableCell>
                  <TableCell>{item?.name}</TableCell>
                  <TableCell>{b.supplierName}</TableCell>
                  <TableCell>{b.manufacturingDate}</TableCell>
                  <TableCell>{b.expiryDate}</TableCell>
                  <TableCell align="right">${item ? Math.round(item.averageCost * b.availableQty).toLocaleString() : 0}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );

  const expiryTab = (
    <Stack spacing={2}>
      <ExportBar
        onExport={() =>
          exportToCsv(
            'expiry-report',
            [
              { header: 'Product', accessor: (b) => itemById(b.itemId)?.name ?? '' },
              { header: 'Batch', accessor: (b) => b.batchNumber },
              { header: 'Warehouse', accessor: (b) => warehouseById(b.warehouseId)?.name ?? '' },
              { header: 'Available Qty', accessor: (b) => b.availableQty },
              { header: 'Expiry', accessor: (b) => b.expiryDate },
              { header: 'Status', accessor: (b) => expirySeverity(daysUntil(b.expiryDate)).label },
            ],
            expirySorted,
          )
        }
      />
      <Card variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Batch</TableCell>
              <TableCell>Warehouse</TableCell>
              <TableCell align="right">Available Qty</TableCell>
              <TableCell>Expiry</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expirySorted.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{itemById(b.itemId)?.name}</TableCell>
                  <TableCell>{b.batchNumber}</TableCell>
                  <TableCell>{warehouseById(b.warehouseId)?.name}</TableCell>
                  <TableCell align="right">{b.availableQty.toLocaleString()}</TableCell>
                  <TableCell>{b.expiryDate}</TableCell>
                  <TableCell><ExpiryChip dateStr={b.expiryDate} /></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title="Inventory Reports"
        subtitle="Search, filter, export — every report supports PDF/Excel and date ranges"
      />
      <DetailTabs
        tabs={[
          { label: 'Stock Reports', content: stockTab },
          { label: 'Movement Reports', content: movementTab },
          { label: 'Batch Reports', content: batchTab },
          { label: 'Expiry Reports', content: expiryTab },
        ]}
      />
    </Box>
  );
}
