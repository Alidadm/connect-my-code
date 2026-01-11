import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

const PhoneInputField = forwardRef<HTMLInputElement, PhoneInputFieldProps>(
  ({ value, onChange, placeholder = "Phone number", className, disabled, required }, ref) => {
    return (
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        defaultCountry="US"
        value={value}
        onChange={(val) => onChange(val || '')}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:flex-1",
          "[&_.PhoneInputCountry]:mr-2",
          "[&_.PhoneInputCountrySelect]:border-0 [&_.PhoneInputCountrySelect]:bg-transparent",
          "[&_.PhoneInputCountryIcon]:w-6 [&_.PhoneInputCountryIcon]:h-4",
          className
        )}
      />
    );
  }
);

PhoneInputField.displayName = 'PhoneInputField';

export { PhoneInputField };
