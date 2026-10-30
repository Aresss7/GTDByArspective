import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  title?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  className = '',
  title,
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 border select-none ${
        checked
          ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900 shadow-xs'
          : 'bg-white dark:bg-[#191919] border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-500'
      } ${className}`}
    >
      {checked && (
        <Check className="w-3.5 h-3.5 stroke-[3] animate-fadeIn" />
      )}
    </button>
  );
};
