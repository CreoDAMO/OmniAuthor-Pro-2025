import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  'data-testid'?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  'data-testid': testId = 'loading-spinner' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="loading-spinner" data-testid={testId}>
      <div className={`spinner ${sizeClasses[size]}`}></div>
    </div>
  );
};

export default LoadingSpinner;