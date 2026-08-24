import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ModelsPage from './ModelsPage.jsx';

const catalog = {
  free: [
    { id: 'gpt-free', label: 'GPT Free' },
    {
      id: 'gemini-preview',
      label: 'Gemini Preview',
      providerStatus: 'preview',
      statusNote: 'Preview model',
    },
  ],
  plus: [
    {
      id: 'claude-plus',
      label: 'Claude Plus',
      scheduledRetirement: 'May 7, 2027',
    },
  ],
  pro: [{ id: 'gpt-pro', label: 'GPT Pro' }],
};

describe('ModelsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(catalog),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('displays the models belonging to an opened provider', async () => {
    render(<ModelsPage />);

    const openAiHeading = await screen.findByText('OpenAI');
    const openAiDropdown = openAiHeading.closest('details');
    fireEvent.click(within(openAiDropdown).getByText('OpenAI'));

    expect(within(openAiDropdown).getByText('2 models')).toBeInTheDocument();
    expect(within(openAiDropdown).getByText('GPT Free')).toBeInTheDocument();
    expect(within(openAiDropdown).getByText('Free')).toBeInTheDocument();
    expect(within(openAiDropdown).getByText('GPT Pro')).toBeInTheDocument();
    expect(within(openAiDropdown).getByText('Pro')).toBeInTheDocument();

    const geminiDropdown = screen.getByText('Gemini').closest('details');
    expect(within(geminiDropdown).getByText('Gemini Preview')).toBeInTheDocument();
    expect(within(geminiDropdown).getByText('Preview model')).toBeInTheDocument();
    expect(within(geminiDropdown).getByText('Preview')).toBeInTheDocument();

    const anthropicDropdown = screen.getByText('Anthropic').closest('details');
    expect(
      within(anthropicDropdown).getByText('Scheduled retirement: May 7, 2027'),
    ).toBeInTheDocument();
  });
});
