import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import FormSelectField from '../../components/FormSelectField';
import { useProcurement } from '../../store/ProcurementStore';
import { ApiError } from '../../../shared/api/client';
import type { VendorCategory } from '../../data/types';

const categories: VendorCategory[] = ['API Supplier', 'Excipients', 'Packaging', 'Lab Equipment', 'Logistics', 'MRO'];
const businessTypes = ['Manufacturer', 'Distributor', 'Service Provider'];
const currencies = ['NPR'];

export default function VendorForm() {
  const navigate = useNavigate();
  const { addVendor } = useProcurement();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<VendorCategory>(categories[0]);
  const [country, setCountry] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [businessType, setBusinessType] = useState(businessTypes[0]);
  const [establishedDate, setEstablishedDate] = useState('');
  const [primaryContact, setPrimaryContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [currency, setCurrency] = useState(currencies[0]);
  const [creditLimit, setCreditLimit] = useState(0);

  const canSubmit = name.trim() !== '' && email.trim() !== '' && country.trim() !== '';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const id = await addVendor({
        name,
        category,
        country,
        registrationNumber,
        vatNumber,
        businessType,
        establishedDate,
        primaryContact,
        phone,
        email,
        website,
        address,
        paymentTerms,
        currency,
        creditLimit,
        bankAccount: '—',
        status: 'Pending Approval',
        documents: [],
      });
      navigate(`/procurement/vendors/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the vendor.');
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1400px' } }}>
      <PageHeader
        title="Add Vendor"
        subtitle="New vendors start as Pending Approval"
        actions={
          <Button onClick={() => navigate('/procurement/vendors')}>Cancel</Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardHeader title="Company Information" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField fullWidth label="Company Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alpine Pharma Chemicals" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormSelectField fullWidth label="Category" value={category} onChange={(e) => setCategory(e.target.value as VendorCategory)}>
                  {categories.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Registration Number" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="VAT Number" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="Business Type" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                  {businessTypes.map((b) => (
                    <MenuItem key={b} value={b}>{b}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField fullWidth type="date" label="Established Date" value={establishedDate} onChange={(e) => setEstablishedDate(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField fullWidth label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Switzerland" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Contact" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField fullWidth label="Primary Contact" value={primaryContact} onChange={(e) => setPrimaryContact(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField fullWidth label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField fullWidth type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormField fullWidth label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormField fullWidth label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Financial" slotProps={{ title: { variant: 'subtitle2' } }} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth label="Payment Terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormSelectField fullWidth label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {currencies.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </FormSelectField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormField fullWidth type="number" label="Credit Limit" value={creditLimit} onChange={(e) => setCreditLimit(Number(e.target.value))} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" onClick={() => navigate('/procurement/vendors')}>Cancel</Button>
          <Button variant="contained" disabled={!canSubmit || submitting} loading={submitting} onClick={handleSubmit}>
            Submit for Approval
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
