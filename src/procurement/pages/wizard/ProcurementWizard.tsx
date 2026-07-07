import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import FormSelectField from '../../components/FormSelectField';
import { useProcurement } from '../../store/ProcurementStore';
import { departments } from '../../data/mockData';
import type { Priority, RequisitionItem, VendorCategory } from '../../data/types';

const priorities: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
const categories: VendorCategory[] = ['API Supplier', 'Excipients', 'Packaging', 'Lab Equipment', 'Logistics', 'MRO'];
const APPROVER = 'Grace Liu';

type ItemRow = RequisitionItem & { key: number };

let rowId = 0;
function blankItem(): ItemRow {
  rowId += 1;
  return { key: rowId, item: '', description: '', requiredQty: 0, unit: 'kg', currentStock: 0, requiredDate: '', remarks: '' };
}

type QuoteDraft = { price: string; deliveryDays: string; paymentTerms: string; qualityRating: string; submitted: boolean };
const BLANK_QUOTE_DRAFT: QuoteDraft = { price: '', deliveryDays: '', paymentTerms: '', qualityRating: '', submitted: false };

function scoreOf(d: QuoteDraft): number {
  if (!d.submitted) return 0;
  const price = Number(d.price) || 0;
  const delivery = Number(d.deliveryDays) || 0;
  const quality = Number(d.qualityRating) || 0;
  // Lower price/delivery is better; this is a single-vendor-friendly rough score, not the
  // multi-vendor normalised score the real RFQ store computes once quotes are submitted.
  const priceScore = price > 0 ? Math.max(0, 1 - price / (price + 1000)) : 0;
  const deliveryScore = delivery > 0 ? Math.max(0, 1 - delivery / 30) : 0;
  const qualityScore = Math.max(0, Math.min(1, quality / 5));
  return Math.round((0.4 * priceScore + 0.3 * deliveryScore + 0.3 * qualityScore) * 100);
}

const STEPS = ['Request Materials', 'Get Quotes', 'Award & Purchase Order', 'Review & Create'];

export default function ProcurementWizard() {
  const navigate = useNavigate();
  const { vendors, addRequisition, approveRequisition, addRfq, submitQuote, awardRfq, addPurchaseOrder } = useProcurement();

  const today = new Date().toISOString().slice(0, 10);
  const [activeStep, setActiveStep] = useState(0);

  // Step 1 — Request Materials (becomes the Requisition, and the item list every later step reuses)
  const [department, setDepartment] = useState(departments[0]);
  const [requester, setRequester] = useState('Riley Carter');
  const [requiredDate, setRequiredDate] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [purpose, setPurpose] = useState('');
  const [items, setItems] = useState<ItemRow[]>([blankItem()]);

  const updateItem = (key: number, field: keyof RequisitionItem, value: string | number) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));

  // Step 2 — Get Quotes (becomes the RFQ)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VendorCategory>(categories[0]);
  const [closingDate, setClosingDate] = useState('');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteDraft>>({});

  const toggleVendor = (id: string) =>
    setSelectedVendors((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));

  const updateQuote = (vendorId: string, field: 'price' | 'deliveryDays' | 'paymentTerms' | 'qualityRating', value: string) =>
    setQuotes((prev) => ({
      ...prev,
      [vendorId]: { ...(prev[vendorId] ?? BLANK_QUOTE_DRAFT), [field]: value },
    }));

  const submitVendorQuote = (vendorId: string) =>
    setQuotes((prev) => ({ ...prev, [vendorId]: { ...prev[vendorId], submitted: true } }));

  // Step 3 — Award & Purchase Order
  const [awardedVendorId, setAwardedVendorId] = useState<string | null>(null);
  const [warehouse, setWarehouse] = useState('Main Warehouse - WH01');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [shipping, setShipping] = useState(0);

  const submittedQuotes = selectedVendors
    .map((vid) => ({ vendorId: vid, draft: quotes[vid] }))
    .filter((q) => q.draft?.submitted);
  const bestVendorId = submittedQuotes.length
    ? submittedQuotes.reduce((best, q) => (scoreOf(q.draft) > scoreOf(best.draft) ? q : best), submittedQuotes[0]).vendorId
    : null;
  const awardedQuote = awardedVendorId ? quotes[awardedVendorId] : undefined;
  const awardedVendorName = vendors.find((v) => v.id === awardedVendorId)?.name ?? '';
  const unitPrice = Number(awardedQuote?.price) || 0;

  const poItems = useMemo(
    () =>
      items.map((it) => ({
        product: it.item,
        description: it.description,
        qty: it.requiredQty,
        unit: it.unit,
        unitPrice,
        discount: 0,
        vat: 0,
      })),
    [items, unitPrice],
  );

  const subtotal = poItems.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const grandTotal = subtotal + shipping;

  // Validation gates — Next stays disabled until the step's minimum viable info is filled.
  const step0Valid = department !== '' && requester.trim() !== '' && purpose.trim() !== '' && items.some((it) => it.item.trim() !== '');
  const step1Valid = title.trim() !== '' && closingDate !== '' && selectedVendors.length > 0;
  const step2Valid = awardedVendorId !== null && expectedDelivery !== '';
  const canFinish = step0Valid && step1Valid && step2Valid;

  const stepValid = [step0Valid, step1Valid, step2Valid, canFinish][activeStep];

  const finish = () => {
    const reqId = addRequisition(
      {
        department,
        requestedBy: requester,
        requestDate: today,
        requiredDate,
        priority,
        purpose,
        items: items.map(({ key: _key, ...rest }) => rest),
      },
      true,
    );
    approveRequisition(reqId, APPROVER);

    const cleanItems: RequisitionItem[] = items.map(({ key: _key, ...rest }) => rest);
    const rfqId = addRfq(
      {
        title,
        category,
        createdDate: today,
        closingDate,
        currency: 'NPR',
        invitedVendors: selectedVendors,
        items: cleanItems,
      },
      true,
    );
    submittedQuotes.forEach(({ vendorId, draft }) => {
      const vendorName = vendors.find((v) => v.id === vendorId)?.name ?? vendorId;
      submitQuote(rfqId, {
        vendorId,
        vendorName,
        price: Number(draft.price) || 0,
        deliveryDays: Number(draft.deliveryDays) || 0,
        paymentTerms: draft.paymentTerms,
        qualityRating: Number(draft.qualityRating) || 0,
      });
    });
    if (awardedVendorId) awardRfq(rfqId, awardedVendorId);

    const poId = addPurchaseOrder(
      {
        vendorId: awardedVendorId ?? '',
        vendorName: awardedVendorName,
        date: today,
        expectedDelivery,
        currency: 'NPR',
        warehouse,
        department,
        amount: grandTotal,
        createdBy: APPROVER,
        items: poItems,
      },
      true,
    );
    navigate(`/procurement/purchase-orders/${poId}`);
  };

  const requestStep = (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardHeader title="1. What do you need?" slotProps={{ title: { variant: 'subtitle2' } }} />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormSelectField fullWidth size="small" label="Department" value={department} onChange={(e) => setDepartment(e.target.value)}>
                {departments.map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </FormSelectField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormField fullWidth size="small" label="Requester" value={requester} onChange={(e) => setRequester(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormSelectField fullWidth size="small" label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {priorities.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </FormSelectField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormField fullWidth size="small" type="date" label="Required Date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <FormField fullWidth size="small" label="Purpose" placeholder="e.g. Batch B-2207 production" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
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
                <TableCell>Item</TableCell>
                <TableCell>Description</TableCell>
                <TableCell width={100}>Qty</TableCell>
                <TableCell width={90}>Unit</TableCell>
                <TableCell width={150}>Required Date</TableCell>
                <TableCell width={50} />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <TextField variant="standard" placeholder="Lactose Monohydrate" value={row.item} onChange={(e) => updateItem(row.key, 'item', e.target.value)} fullWidth />
                  </TableCell>
                  <TableCell>
                    <TextField variant="standard" placeholder="Grade / spec" value={row.description} onChange={(e) => updateItem(row.key, 'description', e.target.value)} fullWidth />
                  </TableCell>
                  <TableCell>
                    <TextField variant="standard" type="number" value={row.requiredQty} onChange={(e) => updateItem(row.key, 'requiredQty', Number(e.target.value))} fullWidth />
                  </TableCell>
                  <TableCell>
                    <TextField variant="standard" value={row.unit} onChange={(e) => updateItem(row.key, 'unit', e.target.value)} fullWidth />
                  </TableCell>
                  <TableCell>
                    <TextField variant="standard" type="date" value={row.requiredDate} onChange={(e) => updateItem(row.key, 'requiredDate', e.target.value)} fullWidth />
                  </TableCell>
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
    </Stack>
  );

  const quotesStep = (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardHeader title="2. Ask vendors to quote" slotProps={{ title: { variant: 'subtitle2' } }} />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormField fullWidth size="small" label="Title" placeholder="e.g. Lactose Monohydrate — Q3 Supply" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormSelectField fullWidth size="small" label="Purchase Category" value={category} onChange={(e) => setCategory(e.target.value as VendorCategory)}>
                {categories.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </FormSelectField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormField fullWidth size="small" type="date" label="Closing Date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title="Select vendors to invite" slotProps={{ title: { variant: 'subtitle2' } }} subheader={`${selectedVendors.length} selected`} />
        <CardContent sx={{ pt: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Vendor</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Country</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id} hover onClick={() => toggleVendor(v.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedVendors.includes(v.id)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>{v.name.charAt(0)}</Avatar>
                      {v.name}
                    </Stack>
                  </TableCell>
                  <TableCell>{v.category}</TableCell>
                  <TableCell>{v.country}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );

  const awardStep = (
    <Stack spacing={2}>
      {selectedVendors.length === 0 ? (
        <Alert severity="warning">Go back and select at least one vendor first.</Alert>
      ) : (
        <Card variant="outlined">
          <CardHeader title="3. Enter each vendor's quote, then award" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vendor</TableCell>
                  <TableCell width={110} align="right">Price (NPR)</TableCell>
                  <TableCell width={110} align="right">Delivery (days)</TableCell>
                  <TableCell width={130}>Payment Terms</TableCell>
                  <TableCell width={110} align="right">Quality (0–5)</TableCell>
                  <TableCell width={200} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedVendors.map((vid) => {
                  const v = vendors.find((vend) => vend.id === vid);
                  const d = quotes[vid] ?? { price: '', deliveryDays: '', paymentTerms: '', qualityRating: '', submitted: false };
                  const valid = d.price !== '' && d.deliveryDays !== '' && d.qualityRating !== '';
                  const isBest = d.submitted && vid === bestVendorId;
                  const isAwarded = vid === awardedVendorId;
                  return (
                    <TableRow key={vid} selected={isAwarded}>
                      <TableCell>
                        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>{v?.name.charAt(0)}</Avatar>
                          {v?.name ?? vid}
                          {isBest && <Chip size="small" color="success" label="Best score" />}
                          {isAwarded && <Chip size="small" color="primary" icon={<EmojiEventsRoundedIcon />} label="Awarded" />}
                        </Stack>
                      </TableCell>
                      <TableCell align="right"><TextField variant="standard" type="number" value={d.price} onChange={(e) => updateQuote(vid, 'price', e.target.value)} sx={{ width: 90 }} /></TableCell>
                      <TableCell align="right"><TextField variant="standard" type="number" value={d.deliveryDays} onChange={(e) => updateQuote(vid, 'deliveryDays', e.target.value)} sx={{ width: 90 }} /></TableCell>
                      <TableCell><TextField variant="standard" placeholder="Net 30" value={d.paymentTerms} onChange={(e) => updateQuote(vid, 'paymentTerms', e.target.value)} sx={{ width: 110 }} /></TableCell>
                      <TableCell align="right"><TextField variant="standard" type="number" value={d.qualityRating} onChange={(e) => updateQuote(vid, 'qualityRating', e.target.value)} sx={{ width: 80 }} /></TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Button size="small" variant={d.submitted ? 'outlined' : 'contained'} disabled={!valid} onClick={() => submitVendorQuote(vid)}>
                            {d.submitted ? 'Update' : 'Submit'}
                          </Button>
                          <Button size="small" variant={isAwarded ? 'contained' : 'outlined'} color="success" disabled={!d.submitted} onClick={() => setAwardedVendorId(vid)}>
                            Award
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {awardedVendorId && (
        <Card variant="outlined">
          <CardHeader title="Purchase order details" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" label="Vendor" value={awardedVendorName} disabled />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth size="small" label="Warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
                  {['Main Warehouse - WH01', 'Packaging Store - WH03', 'Maintenance Store - WH04', 'QC Lab - WH05'].map((w) => (
                    <MenuItem key={w} value={w}>{w}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth size="small" type="date" label="Expected Delivery" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Stack>
  );

  const reviewStep = (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardHeader title="4. Review before creating" slotProps={{ title: { variant: 'subtitle2' } }} />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Department</Typography><Typography variant="body2">{department}</Typography></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Requester</Typography><Typography variant="body2">{requester}</Typography></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Vendor</Typography><Typography variant="body2">{awardedVendorName}</Typography></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Expected Delivery</Typography><Typography variant="body2">{expectedDelivery || '—'}</Typography></Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title="Items & Total" slotProps={{ title: { variant: 'subtitle2' } }} />
        <CardContent sx={{ pt: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="right">Line Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {poItems.map((it, i) => (
                <TableRow key={i}>
                  <TableCell>{it.product}</TableCell>
                  <TableCell align="right">{it.qty}</TableCell>
                  <TableCell>{it.unit}</TableCell>
                  <TableCell align="right">NPR {it.unitPrice.toLocaleString()}</TableCell>
                  <TableCell align="right">NPR {(it.qty * it.unitPrice).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Divider sx={{ my: 1.5 }} />
          <Stack sx={{ alignItems: 'flex-end', gap: 0.5 }}>
            <Stack direction="row" sx={{ gap: 2 }}>
              <Typography variant="body2">Shipping</Typography>
              <TextField variant="standard" type="number" size="small" value={shipping} onChange={(e) => setShipping(Number(e.target.value))} sx={{ width: 100 }} />
            </Stack>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Grand Total: NPR {grandTotal.toLocaleString()}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Alert severity="info">
        Clicking "Create Purchase Order" will auto-create and approve the requisition, send the RFQ, record the
        awarded vendor's quote, and issue the purchase order — all in one go.
      </Alert>
    </Stack>
  );

  const stepContent = [requestStep, quotesStep, awardStep, reviewStep][activeStep];

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1400px' } }}>
      <PageHeader
        title="Guided Purchase"
        subtitle="One flow from material request to purchase order"
        actions={
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/procurement')}>
            Cancel
          </Button>
        }
      />

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {stepContent}

      <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 3 }}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          disabled={activeStep === 0}
          onClick={() => setActiveStep((s) => s - 1)}
        >
          Back
        </Button>
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            disabled={!stepValid}
            onClick={() => setActiveStep((s) => s + 1)}
          >
            Next
          </Button>
        ) : (
          <Button variant="contained" color="success" disabled={!canFinish} onClick={finish}>
            Create Purchase Order
          </Button>
        )}
      </Stack>
    </Box>
  );
}
