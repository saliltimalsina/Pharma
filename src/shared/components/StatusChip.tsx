import Chip, { ChipProps } from '@mui/material/Chip';

type ChipColor = ChipProps['color'];

const STATUS_COLOR: Record<string, ChipColor> = {
  Active: 'success',
  Inactive: 'default',
  Pending: 'warning',
  'Pending Invitation': 'warning',
  Deactivated: 'default',
  Critical: 'error',
  Warning: 'warning',
  Info: 'info',
  Unread: 'info',
  Read: 'default',
};

export default function StatusChip({
  status,
  size = 'small',
}: {
  status: string;
  size?: ChipProps['size'];
}) {
  return (
    <Chip
      label={status}
      color={STATUS_COLOR[status] ?? 'default'}
      size={size}
      variant={STATUS_COLOR[status] ? 'filled' : 'outlined'}
    />
  );
}
