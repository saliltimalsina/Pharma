import { useState } from 'react';
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
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import DetailTabs from '../../components/DetailTabs';
import { useProcurement } from '../../store/ProcurementStore';
import type { Rfq, Vendor } from '../../data/types';

function LabeledValue({ label, value }: { label: string; value?: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value || '—'}</Typography>
    </Box>
  );
}

type QuoteDraft = { price: string; deliveryDays: string; paymentTerms: string; qualityRating: string };

// Interactive quote capture — one editable row per invited vendor. Real entered
// values are pushed into the store via submitQuote, which re-scores the RFQ.
function QuotationsPanel({
  rfq,
  vendors,
  onSubmit,
}: {
  rfq: Rfq;
  vendors: Vendor[];
  onSubmit: (vendorId: string, vendorName: string, draft: QuoteDraft) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, QuoteDraft>>(() => {
    const initial: Record<string, QuoteDraft> = {};
    rfq.invitedVendors.forEach((vid) => {
      const q = rfq.quotes.find((qt) => qt.vendorId === vid && qt.submitted);
      initial[vid] = {
        price: q ? String(q.price) : '',
        deliveryDays: q ? String(q.deliveryDays) : '',
        paymentTerms: q ? q.paymentTerms : '',
        qualityRating: q ? String(q.qualityRating) : '',
      };
    });
    return initial;
  });

  const update = (vid: string, field: keyof QuoteDraft, value: string) =>
    setDrafts((prev) => ({ ...prev, [vid]: { ...prev[vid], [field]: value } }));

  if (rfq.invitedVendors.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No vendors invited yet — invite vendors when creating the RFQ to capture quotes.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Vendor</TableCell>
            <TableCell width={120} align="right">Price ({rfq.currency})</TableCell>
            <TableCell width={120} align="right">Delivery (days)</TableCell>
            <TableCell width={140}>Payment Terms</TableCell>
            <TableCell width={130} align="right">Quality (0–5)</TableCell>
            <TableCell width={120} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rfq.invitedVendors.map((vid) => {
            const v = vendors.find((vend) => vend.id === vid);
            const d = drafts[vid] ?? { price: '', deliveryDays: '', paymentTerms: '', qualityRating: '' };
            const submitted = rfq.quotes.some((q) => q.vendorId === vid && q.submitted);
            const valid = d.price !== '' && d.deliveryDays !== '' && d.qualityRating !== '';
            return (
              <TableRow key={vid}>
                <TableCell>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>{v?.name.charAt(0)}</Avatar>
                    {v?.name ?? vid}
                    {submitted && <Chip size="small" color="success" label="Submitted" />}
                  </Stack>
                </TableCell>
                <TableCell align="right"><TextField variant="standard" type="number" value={d.price} onChange={(e) => update(vid, 'price', e.target.value)} sx={{ width: 90 }} /></TableCell>
                <TableCell align="right"><TextField variant="standard" type="number" value={d.deliveryDays} onChange={(e) => update(vid, 'deliveryDays', e.target.value)} sx={{ width: 90 }} /></TableCell>
                <TableCell><TextField variant="standard" placeholder="Net 30" value={d.paymentTerms} onChange={(e) => update(vid, 'paymentTerms', e.target.value)} sx={{ width: 120 }} /></TableCell>
                <TableCell align="right"><TextField variant="standard" type="number" value={d.qualityRating} onChange={(e) => update(vid, 'qualityRating', e.target.value)} sx={{ width: 80 }} /></TableCell>
                <TableCell align="right">
                  <Button size="small" variant="contained" disabled={!valid} onClick={() => onSubmit(vid, v?.name ?? vid, d)}>
                    {submitted ? 'Update' : 'Submit'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

export default function RFQDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { rfqs, vendors, submitQuote, awardRfq } = useProcurement();
  const rfq = rfqs.find((r) => r.id === id);

  if (!rfq) {
    return (
      <Box>
        <Typography>RFQ not found.</Typography>
        <Button onClick={() => navigate('/procurement/rfqs')}>Back to list</Button>
      </Box>
    );
  }

  const submittedQuotes = rfq.quotes.filter((q) => q.submitted);
  const bestQuote = submittedQuotes.length
    ? submittedQuotes.reduce((best, q) => (q.score > best.score ? q : best), submittedQuotes[0])
    : undefined;

  const handleSubmitQuote = (vendorId: string, vendorName: string, draft: QuoteDraft) => {
    submitQuote(rfq.id, {
      vendorId,
      vendorName,
      price: Number(draft.price),
      deliveryDays: Number(draft.deliveryDays),
      paymentTerms: draft.paymentTerms || '—',
      qualityRating: Number(draft.qualityRating),
    });
  };

  const overviewTab = (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>RFQ Information</Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="RFQ Number" value={rfq.rfqNo} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Category" value={rfq.category} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Currency" value={rfq.currency} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Created Date" value={rfq.createdDate} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Closing Date" value={rfq.closingDate} /></Grid>
              <Grid size={{ xs: 6, sm: 4 }}><LabeledValue label="Invited Vendors" value={`${rfq.invitedVendors.length}`} /></Grid>
              <Grid size={{ xs: 12 }}><LabeledValue label="Title" value={rfq.title} /></Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Status</Typography>
            <StatusChip status={rfq.status} />
            <Stack sx={{ mt: 2, gap: 1 }}>
              <LabeledValue label="Responses" value={`${submittedQuotes.length} / ${rfq.invitedVendors.length}`} />
            </Stack>
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
            <TableCell>Item</TableCell>
            <TableCell>Specifications</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell>Required Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rfq.items.map((item, i) => (
            <TableRow key={i} hover>
              <TableCell sx={{ fontWeight: 500 }}>{item.item}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell align="right">{item.requiredQty}</TableCell>
              <TableCell>{item.unit}</TableCell>
              <TableCell>{item.requiredDate}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const invitedTab = (
    <Card variant="outlined">
      <List>
        {rfq.invitedVendors.length === 0 && (
          <ListItem><ListItemText primary="No vendors invited yet" /></ListItem>
        )}
        {rfq.invitedVendors.map((vid) => {
          const v = vendors.find((vend) => vend.id === vid);
          const quote = rfq.quotes.find((q) => q.vendorId === vid);
          return (
            <ListItem
              key={vid}
              divider
              secondaryAction={<StatusChip status={quote?.submitted ? 'Submitted' : 'Pending'} />}
            >
              <ListItemAvatar>
                <Avatar>{v?.name.charAt(0)}</Avatar>
              </ListItemAvatar>
              <ListItemText primary={v?.name ?? vid} secondary={v?.category} />
            </ListItem>
          );
        })}
      </List>
    </Card>
  );

  const quotationsTab = (
    <QuotationsPanel rfq={rfq} vendors={vendors} onSubmit={handleSubmitQuote} />
  );

  const comparisonTab = (
    <Stack spacing={2}>
      <Card variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Vendor</TableCell>
              <TableCell align="right">Price ({rfq.currency})</TableCell>
              <TableCell align="right">Delivery (days)</TableCell>
              <TableCell align="right">Quality Rating</TableCell>
              <TableCell>Payment Terms</TableCell>
              <TableCell align="right">Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submittedQuotes.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>No quotes submitted yet — enter them in the Quotations tab</TableCell></TableRow>
            )}
            {submittedQuotes.map((q) => (
              <TableRow
                key={q.vendorId}
                hover
                sx={q.vendorId === bestQuote?.vendorId ? { bgcolor: 'action.selected' } : undefined}
              >
                <TableCell sx={{ fontWeight: 500 }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                    {q.vendorId === bestQuote?.vendorId && (
                      <EmojiEventsRoundedIcon fontSize="small" color="warning" />
                    )}
                    {q.vendorName}
                  </Stack>
                </TableCell>
                <TableCell align="right">{q.price}</TableCell>
                <TableCell align="right">{q.deliveryDays}</TableCell>
                <TableCell align="right">{q.qualityRating}</TableCell>
                <TableCell>{q.paymentTerms}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{q.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {bestQuote && (
        <Card variant="outlined" sx={{ borderColor: 'success.main' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: 'success.main' }}>Recommended Vendor</Typography>
                <Typography variant="h6">{bestQuote.vendorName}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Highest overall score ({bestQuote.score}) — best balance of price, delivery time and quality rating.
                </Typography>
              </Box>
              <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<EmojiEventsRoundedIcon />}
                  disabled={rfq.status === 'Awarded'}
                  onClick={() => awardRfq(rfq.id, bestQuote.vendorId)}
                >
                  {rfq.status === 'Awarded' ? 'Awarded' : 'Award Vendor'}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (rfq.status !== 'Awarded') awardRfq(rfq.id, bestQuote.vendorId);
                    navigate(`/procurement/purchase-orders/new?fromRfq=${rfq.id}`);
                  }}
                >
                  Generate Purchase Order
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );

  const awardTab = (
    <Card variant="outlined">
      <List>
        {rfq.awardedVendor ? (
          <ListItem>
            <ListItemAvatar><Avatar><EmojiEventsRoundedIcon /></Avatar></ListItemAvatar>
            <ListItemText
              primary={`Awarded to ${vendors.find((v) => v.id === rfq.awardedVendor)?.name}`}
              secondary={`Closed ${rfq.closingDate}`}
            />
          </ListItem>
        ) : (
          <ListItem><ListItemText primary="Not awarded yet" secondary="Use Award Vendor in the Comparison tab to award this RFQ" /></ListItem>
        )}
      </List>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title={rfq.rfqNo}
        subtitle={rfq.title}
        actions={
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/procurement/rfqs')}>Back</Button>
        }
      />
      <DetailTabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          { label: 'Items', content: itemsTab },
          { label: 'Invited Vendors', content: invitedTab },
          { label: 'Quotations', content: quotationsTab },
          { label: 'Comparison', content: comparisonTab },
          { label: 'Award History', content: awardTab },
        ]}
      />
    </Box>
  );
}
