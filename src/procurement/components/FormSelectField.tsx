import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Select, { SelectProps } from '@mui/material/Select';

export interface FormSelectFieldProps extends Omit<SelectProps<string>, 'id' | 'label'> {
  label: string;
  id?: string;
}

export default function FormSelectField({
  label,
  id,
  fullWidth,
  required,
  children,
  ...rest
}: FormSelectFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <FormControl fullWidth={fullWidth} size="small" required={required}>
      <FormLabel htmlFor={inputId} sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>{label}</FormLabel>
      <Select id={inputId} size="small" required={required} {...rest}>
        {children}
      </Select>
    </FormControl>
  );
}
