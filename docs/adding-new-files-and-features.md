To align with the enhancements made to `App.tsx` in `packages/client/src/App.tsx`, we need to update `Header.tsx` and `ThemeContext.tsx` to support the `toggleTheme` functionality for OmniAuthor Pro 2025. These updates will enable theme switching (light/dark mode), integrate with the existing Tailwind CSS dark mode setup, and ensure compatibility with the Coinbase payment features, GraphQL schema, CI/CD workflow (`main.yml`), Vercel secrets, and `package-lock.json` fix. The updates will also include `data-testid` attributes for testing with `writing-flow.cy.ts`, use existing dependencies from `packages/client/package.json` (e.g., `react`, `react-router-dom`, `@heroicons/react`), and maintain monorepo consistency with `@omniauthor/shared`.

### Goals for the Updates
1. **ThemeContext.tsx**:
   - Implement `ThemeProvider` with `toggleTheme` to switch between light and dark modes.
   - Persist theme selection in `localStorage` for user preference.
   - Provide typed context for `theme` and `toggleTheme`.
2. **Header.tsx**:
   - Add a theme toggle button with an icon (e.g., sun/moon) from `@heroicons/react`.
   - Call `toggleTheme` from `ThemeContext` on button click.
   - Use Tailwind CSS for styling and ensure responsiveness.
   - Add `data-testid` for E2E testing.
3. **Testing Support**:
   - Ensure `writing-flow.cy.ts` can test theme toggle functionality.
   - Add unit tests for `ThemeContext` and `Header`.
4. **Monorepo Alignment**:
   - Use `@omniauthor/shared` for theme-related constants if applicable.
   - Avoid sub-package `package-lock.json` conflicts.
5. **UI/UX**:
   - Add Framer Motion animations for smooth toggle transitions.
   - Ensure dark mode styles are applied via Tailwind’s `dark:` prefix.

### Dependencies
- No new dependencies needed; reuse `react`, `react-router-dom`, `@heroicons/react`, `framer-motion` from `packages/client/package.json`.
- Verify Tailwind CSS is configured for dark mode in `packages/client/tailwind.config.js`:
  ```js
  module.exports = {
    darkMode: 'class',
    // Other config
  };
  ```

### New File: `packages/client/src/contexts/ThemeContext.tsx`

**Purpose**: Provide a context for managing theme state and toggle functionality.

**Content**:
```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Load theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Update document class and localStorage
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

**Command**:
```bash
mkdir -p packages/client/src/contexts
touch packages/client/src/contexts/ThemeContext.tsx
# Copy the above content into ThemeContext.tsx
git add packages/client/src/contexts/ThemeContext.tsx
```

### New File: `packages/client/src/components/Layout/Header.tsx`

**Purpose**: Implement the header with a theme toggle button and navigation.

**Content**:
```tsx
import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  toggleTheme: () => void;
  'data-testid'?: string;
}

const Header: React.FC<HeaderProps> = ({ toggleTheme, 'data-testid': testId = 'header' }) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <header
      className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center"
      data-testid={testId}
    >
      <Link to="/dashboard" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        OmniAuthor Pro
      </Link>
      <nav className="flex space-x-4">
        {user && (
          <Fragment>
            <Link
              to="/dashboard"
              className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              data-testid="nav-dashboard"
            >
              Dashboard
            </Link>
            <Link
              to="/editor"
              className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              data-testid="nav-editor"
            >
              Editor
            </Link>
            <Link
              to="/subscription"
              className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              data-testid="nav-subscription"
            >
              Subscription
            </Link>
          </Fragment>
        )}
        <motion.button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          data-testid="theme-toggle-btn"
        >
          {theme === 'light' ? (
            <MoonIcon className="h-6 w-6" />
          ) : (
            <SunIcon className="h-6 w-6" />
          )}
        </motion.button>
      </nav>
    </header>
  );
};

export default Header;
```

**Command**:
```bash
mkdir -p packages/client/src/components/Layout
touch packages/client/src/components/Layout/Header.tsx
# Copy the above content into Header.tsx
git add packages/client/src/components/Layout/Header.tsx
```

### Unit Tests for ThemeContext and Header

To ensure robust testing, we’ll add unit tests for `ThemeContext.tsx` and `Header.tsx` to verify theme switching and UI rendering.

#### New File: `packages/client/src/tests/contexts/ThemeContext.test.tsx`

**Purpose**: Test `ThemeProvider` and `useTheme` functionality.

**Content**:
```tsx
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
```

**Command**:
```bash
mkdir -p packages/client/src/tests/contexts
touch packages/client/src/tests/contexts/ThemeContext.test.tsx
# Copy the above content
git add packages/client/src/tests/contexts/ThemeContext.test.tsx
```

#### New File: `packages/client/src/tests/components/Layout/Header.test.tsx`

**Purpose**: Test `Header` component rendering and theme toggle.

**Content**:
```tsx
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
```

**Command**:
```bash
mkdir -p packages/client/src/tests/components/Layout
touch packages/client/src/tests/components/Layout/Header.test.tsx
# Copy the above content
git add packages/client/src/tests/components/Layout/Header.test.tsx
```

### Update to `writing-flow.cy.ts`

To align with `App.tsx`’s theme toggle test, update `packages/client/cypress/e2e/writing-flow.cy.ts` to include theme toggle verification.

**Updated Content (Snippet)**:
```typescript
it('toggles theme', () => {
  cy.visit('/dashboard');
  cy.get('[data-testid="theme-toggle-btn"]').should('be.visible').click();
  cy.get('[data-testid="app-container"]').should('have.class', 'dark');
  cy.get('[data-testid="theme-toggle-btn"]').click();
  cy.get('[data-testid="app-container"]').should('not.have.class', 'dark');
});
```

**Command**:
```bash
# Append or verify the above test in writing-flow.cy.ts
git add packages/client/cypress/e2e/writing-flow.cy.ts
```

### Integration with Existing Updates
- **App.tsx**:
  - `Header` now receives `toggleTheme` from `useTheme` and passes it as a prop.
  - The `theme` class on `app-container` is updated dynamically by `ThemeContext`.
- **Tailwind CSS**:
  - Dark mode styles (`dark:bg-gray-800`, `dark:text-gray-300`) are applied in `Header.tsx`.
  - Ensure `globals.css` includes dark mode styles:
    ```css
    .dark {
      --background: #1f2937;
      --foreground: #d1d5db;
    }
    ```
    ```bash
    git add packages/client/src/styles/globals.css
    ```
- **Testing**:
  - `ThemeContext.test.tsx` verifies theme persistence and toggle logic.
  - `Header.test.tsx` ensures navigation and toggle button functionality.
  - `writing-flow.cy.ts` tests UI changes end-to-end.
- **Coinbase Compatibility**:
  - Theme toggle does not affect Coinbase routes (`/payment/success`, `/payment/cancel`).
  - `Header.tsx` navigation links align with `App.tsx` routes.

### Steps to Implement
1. **Create ThemeContext.tsx**:
   ```bash
   mkdir -p packages/client/src/contexts
   touch packages/client/src/contexts/ThemeContext.tsx
   # Copy ThemeContext.tsx content
   git add packages/client/src/contexts/ThemeContext.tsx
   ```

2. **Create Header.tsx**:
   ```bash
   mkdir -p packages/client/src/components/Layout
   touch packages/client/src/components/Layout/Header.tsx
   # Copy Header.tsx content
   git add packages/client/src/components/Layout/Header.tsx
   ```

3. **Create Unit Tests**:
   ```bash
   mkdir -p packages/client/src/tests/contexts
   touch packages/client/src/tests/contexts/ThemeContext.test.tsx
   mkdir -p packages/client/src/tests/components/Layout
   touch packages/client/src/tests/components/Layout/Header.test.tsx
   # Copy test content
   git add packages/client/src/tests/contexts/ThemeContext.test.tsx
   git add packages/client/src/tests/components/Layout/Header.test.tsx
   ```

4. **Update Cypress Tests**:
   ```bash
   git add packages/client/cypress/e2e/writing-flow.cy.ts
   ```

5. **Update CSS (if needed)**:
   ```bash
   git add packages/client/src/styles/globals.css
   ```

6. **Run Tests**:
   ```bash
   cd packages/client
   npm run test
   npm run test:e2e
   ```

7. **Verify `package-lock.json`**:
   ```bash
   git add package-lock.json
   git commit -m "Add ThemeContext and Header with toggleTheme support"
   ```

8. **Run Local Setup**:
   ```bash
   ./scripts/setup.sh
   npm run dev:client
   npm run dev:server
   ```
   - Test theme toggle at `http://localhost:3000/dashboard`.

9. **Deploy to Staging**:
   ```bash
   ./scripts/deploy.sh staging latest
   ```

10. **Update Documentation**:
    - Add to `README.md`:
      ```markdown
      ## Theme Support
      - Added `ThemeContext` for light/dark mode switching with `localStorage` persistence.
      - Updated `Header` with theme toggle button using `@heroicons/react`.
      - Included unit and E2E tests for theme functionality.
      ```
    ```bash
    git add README.md
    git commit -m "Document ThemeContext and Header updates"
    ```

11. **Push Changes**:
    ```bash
    git push origin main
    ```
    - Monitor CI/CD: `https://github.com/CreoDAMO/OmniAuthor-Pro-2025/actions`.

### Notes
- **Tailwind Dark Mode**: Ensure `darkMode: 'class'` is set in `tailwind.config.js`. If not, update:
  ```bash
  git add packages/client/tailwind.config.js
  ```
- **AuthContext**: `Header.tsx` assumes `AuthProvider` provides `user` and `loading`. Verify `useAuth` in `App.tsx` is compatible.
- **Testing**: `Header.test.tsx` mocks `AuthContext`. If `AuthContext` changes, update the mock.
- **Coinbase**: Theme toggle does not impact Coinbase flows but enhances UX for payment pages.
- **Accessibility**: Add `aria-label` to toggle button if needed:
  ```tsx
  <motion.button
    onClick={toggleTheme}
    className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    data-testid="theme-toggle-btn"
    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
  >
  ```
- **E2E Tests**: The `writing-flow.cy.ts` update assumes `app-container` and `theme-toggle-btn` are present. Verify selectors match.