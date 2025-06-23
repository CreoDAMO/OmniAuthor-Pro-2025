import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

const TestComponent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-display">{theme}</span>
      <button onClick={toggleTheme} data-testid="toggle-theme-btn">
        Toggle
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  it('initializes with light theme by default', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme-display')).toHaveTextContent('light');
    expect(document.documentElement.classList).not.toContain('dark');
  });

  it('toggles theme when toggleTheme is called', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    const button = screen.getByTestId('toggle-theme-btn');
    fireEvent.click(button);
    expect(screen.getByTestId('theme-display')).toHaveTextContent('dark');
    expect(document.documentElement.classList).toContain('dark');
    fireEvent.click(button);
    expect(screen.getByTestId('theme-display')).toHaveTextContent('light');
    expect(document.documentElement.classList).not.toContain('dark');
  });

  it('persists theme in localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByTestId('toggle-theme-btn'));
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('throws error when useTheme is used outside ThemeProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    expect(() => render(<TestComponent />)).toThrow('useTheme must be used within a ThemeProvider');
    consoleError.mockRestore();
  });
});