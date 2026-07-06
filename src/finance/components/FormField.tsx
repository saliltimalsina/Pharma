import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import OutlinedInput, { OutlinedInputProps } from '@mui/material/OutlinedInput';

export interface FormFieldProps extends Omit<OutlinedInputProps, 'id' | 'label'> {
  label: string;
  id?: string;
}

export default function FormField({ label, id, fullWidth, ...rest }: FormFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <FormControl fullWidth={fullWidth} size="small">
      <FormLabel htmlFor={inputId}>{label}</FormLabel>
      <OutlinedInput id={inputId} size="small" {...rest} />
    </FormControl>
  );
}
