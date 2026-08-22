import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import MessageRender from './messageRender.jsx';


function renderBullets(items) {
  return render(
    <div className="chat-msg ai">
      <MessageRender
        speaker="ai"
        data={{
          message: {
            format: 'blocks_v1',
            blocks: [{ type: 'bullets', text: '', items }],
          },
        }}
        messageProcessing={false}
      />
    </div>,
  );
}


describe('MessageRender bullet lists', () => {
  test('renders explicitly numbered items as an ordered list', () => {
    renderBullets([
      '99. How will requirements changes be requested?',
      '100. What phased roadmap should follow the initial release?',
    ]);

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');

    expect(list.tagName).toBe('OL');
    expect(list).toHaveAttribute('start', '99');
    expect(items[0]).toHaveAttribute('value', '99');
    expect(items[1]).toHaveAttribute('value', '100');
    expect(items[0]).toHaveTextContent('How will requirements changes be requested?');
    expect(items[0]).not.toHaveTextContent(/^99\./);
  });

  test('keeps ordinary items as an unordered list', () => {
    renderBullets(['Change requests', 'Roadmap planning']);

    expect(screen.getByRole('list').tagName).toBe('UL');
  });
});
