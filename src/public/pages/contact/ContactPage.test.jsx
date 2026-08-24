import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import ContactPage from './ContactPage.jsx';

describe('ContactPage presets', () => {
  test('prefills bug-report fields when requested by the chat link', () => {
    render(
      <MemoryRouter initialEntries={['/support?topic=bug']}>
        <ContactPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue(
      'Bug report',
    );
    expect(
      screen.getByRole('textbox', { name: 'Message' }).value,
    ).toContain('Steps to reproduce:');
  });

  test('keeps the default form for regular contact visits', () => {
    render(
      <MemoryRouter initialEntries={['/contact']}>
        <ContactPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue(
      'Product support',
    );
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('');
  });
});
