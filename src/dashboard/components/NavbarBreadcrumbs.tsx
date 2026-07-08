import { useLocation, Link as RouterLink } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Breadcrumbs, { breadcrumbsClasses } from '@mui/material/Breadcrumbs';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: 'center',
  },
}));

const COMMON_LABELS: Record<string, string> = {
  new: 'New',
  dashboard: 'Dashboard',
};

const PROCUREMENT_LABELS: Record<string, string> = {
  procurement: 'Procurement',
  'guided-purchase': 'Guided Purchase',
  requisitions: 'Material Requisition',
  vendors: 'Vendors',
  rfqs: 'RFQs',
  'purchase-orders': 'Purchase Orders',
  grn: 'Goods Receipt (GRN)',
  reports: 'Procurement Reports',
};

const INVENTORY_LABELS: Record<string, string> = {
  inventory: 'Inventory',
  items: 'Item Master',
  warehouses: 'Warehouses',
  stock: 'Stock',
  transfers: 'Transfers',
  adjustments: 'Stock Adjustment',
  expiry: 'Expiry Monitoring',
  reports: 'Inventory Reports',
};

const FINANCE_LABELS: Record<string, string> = {
  finance: 'Billing & Finance',
  invoices: 'Customer Invoices',
  bills: 'Supplier Bills',
  payments: 'Payments',
  accounting: 'Accounting',
  journal: 'Journal Entry',
  banking: 'Banking',
  taxes: 'Taxes',
  reports: 'Financial Reports',
};

const MODULE_DASHBOARD_LABEL: Record<string, string> = {
  inventory: 'Inventory Dashboard',
  finance: 'Finance Dashboard',
};

export default function NavbarBreadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <StyledBreadcrumbs aria-label="breadcrumb" separator={<NavigateNextRoundedIcon fontSize="small" />}>
        <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600 }}>
          Home
        </Typography>
      </StyledBreadcrumbs>
    );
  }

  const moduleLabels =
    segments[0] === 'inventory' ? INVENTORY_LABELS : segments[0] === 'finance' ? FINANCE_LABELS : PROCUREMENT_LABELS;

  if (segments.length === 1 && MODULE_DASHBOARD_LABEL[segments[0]]) {
    return (
      <StyledBreadcrumbs aria-label="breadcrumb" separator={<NavigateNextRoundedIcon fontSize="small" />}>
        <Link component={RouterLink} to="/" underline="hover" variant="body1" sx={{ color: 'text.secondary' }}>
          Dashboard
        </Link>
        <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600 }}>
          {MODULE_DASHBOARD_LABEL[segments[0]]}
        </Typography>
      </StyledBreadcrumbs>
    );
  }

  let path = '';
  const crumbs = segments.map((seg, i) => {
    path += `/${seg}`;
    const isLast = i === segments.length - 1;
    const label = moduleLabels[seg] ?? COMMON_LABELS[seg] ?? decodeURIComponent(seg);
    return { label, path, isLast };
  });

  return (
    <StyledBreadcrumbs aria-label="breadcrumb" separator={<NavigateNextRoundedIcon fontSize="small" />}>
      <Link component={RouterLink} to="/" underline="hover" variant="body1" sx={{ color: 'text.secondary' }}>
        Dashboard
      </Link>
      {crumbs.map((crumb) =>
        crumb.isLast ? (
          <Typography key={crumb.path} variant="body1" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {crumb.label}
          </Typography>
        ) : (
          <Link
            key={crumb.path}
            component={RouterLink}
            to={crumb.path}
            underline="hover"
            variant="body1"
            sx={{ color: 'text.secondary' }}
          >
            {crumb.label}
          </Link>
        ),
      )}
    </StyledBreadcrumbs>
  );
}
