import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import Header from '../../../components/Layout/Header';

const mockUser = { id: 'user123', email: 'test@example.com' };

describe('Header', () => {
  it('renders navigation links for authenticated user', () => {
    render(
      <AuthProvider value={{ user: mockUser, loading: false }}>
        <ThemeProvider>
          <BrowserRouter>
            <Header toggleTheme={jest.fn()} />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    );
    expect(screen.getByTestId('nav-dashboard')).toHaveTextContent('Dashboard');
    expect(screen.getByTestId('nav-editor')).toHaveTextContent('Editor');
    expect(screen.getByTestId('nav-subscription')).toHaveTextContent('Subscription');
  });

  it('renders theme toggle button and calls toggleTheme', () => {
    const toggleTheme = jest.fn();
    render(
      <AuthProvider value={{ user: mockUser, loading: false }}>
        <ThemeProvider>
          <BrowserRouter>
            <Header toggleTheme={toggleTheme} />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    );
    const toggleButton = screen.getByTestId('theme-toggle-btn');
    expect(toggleButton).toBeInTheDocument();
    fireEvent.click(toggleButton);
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('displays MoonIcon for light theme', () => {
    render(
      <AuthProvider value={{ user: mockUser, loading: false }}>
        <ThemeProvider>
          <BrowserRouter>
            <Header toggleTheme={jest.fn()} />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    );
    expect(screen.getByTestId('theme-toggle-btn').querySelector('svg')).toHaveClass('MoonIcon');
  });
});