import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import OutlinedInput, { OutlinedInputProps } from '@mui/material/OutlinedInput';

export interface FormFieldProps extends Omit<OutlinedInputProps, 'id' | 'label'> {
  label: string;
  id?: string;
}

export default function FormField({ label, id, fullWidth, required, ...rest }: FormFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <FormControl fullWidth={fullWidth} size="small" required={required}>
      <FormLabel htmlFor={inputId} sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>{label}</FormLabel>
      <OutlinedInput id={inputId} size="small" required={required} {...rest} />
    </FormControl>
  );
}
