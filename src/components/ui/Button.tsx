import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20',
  secondary: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100',
  outline: 'border border-ivory-300 bg-white text-charcoal-800 hover:border-rose-300 hover:text-rose-700',
  ghost: 'text-charcoal-700 hover:bg-ivory-200 hover:text-charcoal-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  gold: 'bg-gold-500 text-charcoal-900 hover:bg-gold-400 shadow-sm shadow-gold-500/30',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 p-0',
};

export const buttonClasses = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) =>
  cn(
    'inline-flex items-center justify-center rounded-full font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap select-none',
    variants[variant],
    sizes[size],
    className,
  );

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, leftIcon, rightIcon, children, disabled, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  ),
);
Button.displayName = 'Button';

export interface LinkButtonProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  state?: unknown;
}

export const LinkButton = ({ to, variant = 'primary', size = 'md', className, children, leftIcon, rightIcon, state }: LinkButtonProps) => (
  <Link to={to} state={state} className={buttonClasses(variant, size, className)}>
    {leftIcon}
    {children}
    {rightIcon}
  </Link>
);
