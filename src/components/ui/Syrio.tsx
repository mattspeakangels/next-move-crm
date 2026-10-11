import { ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes } from 'react';

export function Wordmark({ className = '' }: { className?: string }) {
  return <div className={className}><div className="syrio-wordmark">SYRIO</div><div className="syrio-tagline mt-2">YOUR SALES GUIDE</div></div>;
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  return <button className={`syrio-button ${variant === 'primary' ? 'syrio-button-primary' : 'syrio-button-secondary'} ${className}`} {...props} />;
}

export function Field({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`syrio-field ${className}`} {...props} />;
}

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`syrio-panel ${className}`} {...props} />;
}
