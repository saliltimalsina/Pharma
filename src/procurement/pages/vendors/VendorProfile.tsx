import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StatusChip from '../../components/StatusChip';
import DetailTabs from '../../components/DetailTabs';
import PageHeader from '../../components/PageHeader';
import { useProcurement } from '../../store/ProcurementStore';

function LabeledValue({ label, value }: { label: string; value?: string | number }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value ?? '—'}</Typography>
    </Box>
  );
}

export default function VendorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vendors, purchaseOrders, rfqs } = useProcurement();
  const vendor = vendors.find((v) => v.id === id);

  if (!vendor) {
    return (
      <Box>
        <Typography>Vendor not found.</Typography>
        <Button onClick={() => navigate('/procurement/vendors')}>Back to list</Button>
      </Box>
    );
  }

  const vendorPOs = purchaseOrders.filter((p) => p.vendorId === vendor.id);
  const vendorRFQs = rfqs.filter((r) => r.invitedVendors.includes(vendor.id));

  const overviewTab = (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardHeader title="Company Information" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={1.5}>
              <LabeledValue label="Vendor Code" value={vendor.vendorCode} />
              <LabeledValue label="Company Name" value={vendor.name} />
              <LabeledValue label="Registration Number" value={vendor.registrationNumber} />
              <LabeledValue label="VAT Number" value={vendor.vatNumber} />
              <LabeledValue label="Business Type" value={vendor.businessType} />
              <LabeledValue label="Established Date" value={vendor.establishedDate} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardHeader title="Contact" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={1.5}>
              <LabeledValue label="Primary Contact" value={vendor.primaryContact} />
              <LabeledValue label="Phone" value={vendor.phone} />
              <LabeledValue label="Email" value={vendor.email} />
              <LabeledValue label="Website" value={vendor.website} />
              <LabeledValue label="Address" value={vendor.address} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant="outlined">
          <CardHeader title="Financial" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={1.5}>
              <LabeledValue label="Payment Terms" value={vendor.paymentTerms} />
              <LabeledValue label="Currency" value={vendor.currency} />
              <LabeledValue label="Bank Account" value={vendor.bankAccount} />
              <LabeledValue label="Credit Limit" value={`$${vendor.creditLimit.toLocaleString()}`} />
              <LabeledValue label="Outstanding Balance" value={`$${vendor.outstandingBalance.toLocaleString()}`} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const poTab = (
    <Card variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>PO Number</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Expected Delivery</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vendorPOs.length === 0 && (
            <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>No purchase orders yet</TableCell></TableRow>
          )}
          {vendorPOs.map((po) => (
            <TableRow key={po.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/procurement/purchase-orders/${po.id}`)}>
              <TableCell sx={{ fontWeight: 500 }}>{po.poNumber}</TableCell>
              <TableCell>{po.date}</TableCell>
              <TableCell>{po.expectedDelivery}</TableCell>
              <TableCell align="right">${po.amount.toLocaleString()}</TableCell>
              <TableCell><StatusChip status={po.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const rfqTab = (
    <Card variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>RFQ Number</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Closing Date</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vendorRFQs.length === 0 && (
            <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>Not invited to any RFQs</TableCell></TableRow>
          )}
          {vendorRFQs.map((r) => (
            <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/procurement/rfqs/${r.id}`)}>
              <TableCell sx={{ fontWeight: 500 }}>{r.rfqNo}</TableCell>
              <TableCell>{r.title}</TableCell>
              <TableCell>{r.closingDate}</TableCell>
              <TableCell><StatusChip status={r.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const documentsTab = (
    <Card variant="outlined">
      <List>
        {vendor.documents.map((doc) => (
          <ListItem key={doc.name} divider secondaryAction={<StatusChip status={doc.status} />}>
            <ListItemIcon><DescriptionRoundedIcon /></ListItemIcon>
            <ListItemText primary={doc.name} secondary={doc.expiry ? `Expires ${doc.expiry}` : undefined} />
          </ListItem>
        ))}
      </List>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <PageHeader
        title={vendor.name}
        subtitle={`${vendor.vendorCode} · ${vendor.category} · ${vendor.country}`}
        actions={
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/procurement/vendors')}>
            Back
          </Button>
        }
      />
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: { sm: 'center' } }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: '1.4rem' }}>
              {vendor.name.charAt(0)}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{vendor.primaryContact}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Primary contact</Typography>
            </Box>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <StatusChip status={vendor.status} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <DetailTabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          { label: 'Purchase Orders', content: poTab },
          { label: 'RFQs', content: rfqTab },
          { label: 'Documents', content: documentsTab },
        ]}
      />
    </Box>
  );
}
