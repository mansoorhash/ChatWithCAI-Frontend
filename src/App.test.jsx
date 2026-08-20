import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import App from './App.jsx';

describe('public application shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  test('renders the CAI landing page and primary navigation', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /one chat/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /supported models/i }),
    ).toHaveAttribute('href', '/models');
  });
});
