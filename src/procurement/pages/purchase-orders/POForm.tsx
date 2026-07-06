import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import FormSelectField from '../../components/FormSelectField';
import { useProcurement } from '../../store/ProcurementStore';
import { departments } from '../../data/mockData';
import type { PoItem } from '../../data/types';

type ItemRow = PoItem & { key: number };

let rowId = 0;
function blankItem(): ItemRow {
  rowId += 1;
  return { key: rowId, product: '', description: '', qty: 1, unit: 'kg', unitPrice: 0, discount: 0, vat: 0 };
}
function toRow(item: PoItem): ItemRow {
  rowId += 1;
  return { ...item, key: rowId };
}

function lineTotal(item: PoItem) {
  const base = item.qty * item.unitPrice;
  const discounted = base - (base * item.discount) / 100;
  return discounted + (discounted * item.vat) / 100;
}

export default function POForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromRfq = searchParams.get('fromRfq');
  const { vendors, rfqs, addPurchaseOrder } = useProcurement();

  const today = new Date().toISOString().slice(0, 10);

  const sourceRfq = fromRfq ? rfqs.find((r) => r.id === fromRfq) : undefined;
  const sourceSubmitted = sourceRfq ? sourceRfq.quotes.filter((q) => q.submitted) : [];
  const sourceBest = sourceSubmitted.length
    ? sourceSubmitted.reduce((best, q) => (q.score > best.score ? q : best), sourceSubmitted[0])
    : undefined;
  const sourceVendorId = sourceRfq?.awardedVendor ?? sourceBest?.vendorId;
  const sourceQuote = sourceRfq?.quotes.find((q) => q.vendorId === sourceVendorId);

  const [vendorId, setVendorId] = useState(sourceVendorId ?? vendors[0].id);
  const [currency, setCurrency] = useState(sourceRfq?.currency ?? 'USD');
  const [warehouse, setWarehouse] = useState('Main Warehouse - WH01');
  const [department, setDepartment] = useState(departments[0]);
  const [orderDate, setOrderDate] = useState(today);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [approver, setApprover] = useState('Grace Liu');
  const [items, setItems] = useState<ItemRow[]>(() => {
    if (sourceRfq && sourceRfq.items.length) {
      return sourceRfq.items.map((it) =>
        toRow({
          product: it.item,
          description: it.description,
          qty: it.requiredQty,
          unit: it.unit,
          unitPrice: sourceQuote?.price ?? 0,
          discount: 0,
          vat: 0,
        }),
      );
    }
    return [blankItem()];
  });
  const [shipping, setShipping] = useState(0);

  const vendorName = vendors.find((v) => v.id === vendorId)?.name ?? '';

  const updateItem = (key: number, field: keyof PoItem, value: string | number) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  };

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), [items]);
  const discountTotal = useMemo(
    () => items.reduce((sum, it) => sum + (it.qty * it.unitPrice * it.discount) / 100, 0),
    [items],
  );
  const vatTotal = useMemo(
    () =>
      items.reduce((sum, it) => {
        const discounted = it.qty * it.unitPrice - (it.qty * it.unitPrice * it.discount) / 100;
        return sum + (discounted * it.vat) / 100;
      }, 0),
    [items],
  );
  const grandTotal = subtotal - discountTotal + vatTotal + shipping;

  const save = (submit: boolean) => {
    const cleanItems: PoItem[] = items.map(({ key: _key, ...rest }) => rest);
    const id = addPurchaseOrder(
      {
        vendorId,
        vendorName,
        date: orderDate,
        expectedDelivery,
        currency,
        warehouse,
        department,
        amount: grandTotal,
        createdBy: approver,
        items: cleanItems,
      },
      submit,
    );
    navigate('/procurement/purchase-orders/' + id);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1400px' } }}>
      <PageHeader
        title="Create Purchase Order"
        subtitle="Issue an official order to a vendor"
        actions={
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/procurement/purchase-orders')}>Cancel</Button>
        }
      />

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="Header" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" label="PO Number" value="PO-2026-0513 (auto)" disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth size="small" label="Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                  {vendors.map((v) => (
                    <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth size="small" label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {['USD', 'EUR', 'CHF'].map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth size="small" label="Warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
                  {['Main Warehouse - WH01', 'Packaging Store - WH03', 'Maintenance Store - WH04', 'QC Lab - WH05'].map((w) => (
                    <MenuItem key={w} value={w}>{w}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth size="small" label="Department" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  {departments.map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" type="date" label="Order Date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" type="date" label="Expected Date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader
            title="Items"
            slotProps={{ title: { variant: 'subtitle2' } }}
            action={
              <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setItems((prev) => [...prev, blankItem()])}>
                Add Item
              </Button>
            }
          />
          <CardContent sx={{ pt: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell width={80}>Qty</TableCell>
                  <TableCell width={80}>Unit</TableCell>
                  <TableCell width={100}>Unit Price</TableCell>
                  <TableCell width={90}>Discount %</TableCell>
                  <TableCell width={80}>VAT %</TableCell>
                  <TableCell width={110} align="right">Total</TableCell>
                  <TableCell width={50} />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell><TextField variant="standard" fullWidth value={row.product} onChange={(e) => updateItem(row.key, 'product', e.target.value)} /></TableCell>
                    <TableCell><TextField variant="standard" fullWidth value={row.description} onChange={(e) => updateItem(row.key, 'description', e.target.value)} /></TableCell>
                    <TableCell><TextField variant="standard" type="number" fullWidth value={row.qty} onChange={(e) => updateItem(row.key, 'qty', Number(e.target.value))} /></TableCell>
                    <TableCell><TextField variant="standard" fullWidth value={row.unit} onChange={(e) => updateItem(row.key, 'unit', e.target.value)} /></TableCell>
                    <TableCell><TextField variant="standard" type="number" fullWidth value={row.unitPrice} onChange={(e) => updateItem(row.key, 'unitPrice', Number(e.target.value))} /></TableCell>
                    <TableCell><TextField variant="standard" type="number" fullWidth value={row.discount} onChange={(e) => updateItem(row.key, 'discount', Number(e.target.value))} /></TableCell>
                    <TableCell><TextField variant="standard" type="number" fullWidth value={row.vat} onChange={(e) => updateItem(row.key, 'vat', Number(e.target.value))} /></TableCell>
                    <TableCell align="right">${lineTotal(row).toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" disabled={items.length === 1} onClick={() => setItems((prev) => prev.filter((it) => it.key !== row.key))}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardHeader title="Approval" slotProps={{ title: { variant: 'subtitle2' } }} />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={2}>
                  <FormSelectField fullWidth size="small" label="Approver" value={approver} onChange={(e) => setApprover(e.target.value)}>
                    <MenuItem value="Grace Liu">Grace Liu — Procurement Manager</MenuItem>
                    <MenuItem value="Marcus Webb">Marcus Webb — Operations Head</MenuItem>
                  </FormSelectField>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardHeader title="Summary" slotProps={{ title: { variant: 'subtitle2' } }} />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2">Subtotal</Typography>
                    <Typography variant="body2">${subtotal.toFixed(2)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2">Discount</Typography>
                    <Typography variant="body2">-${discountTotal.toFixed(2)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2">VAT</Typography>
                    <Typography variant="body2">${vatTotal.toFixed(2)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Shipping</Typography>
                    <TextField
                      variant="standard"
                      type="number"
                      size="small"
                      value={shipping}
                      onChange={(e) => setShipping(Number(e.target.value))}
                      sx={{ width: 100 }}
                    />
                  </Stack>
                  <Divider />
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1">Grand Total</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>${grandTotal.toFixed(2)}</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" onClick={() => save(false)}>Save as Draft</Button>
          <Button variant="contained" onClick={() => save(true)}>Submit for Approval</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
