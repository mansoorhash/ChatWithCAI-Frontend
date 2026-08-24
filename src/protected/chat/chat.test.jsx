import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Chat from './chat.jsx';
import {
  CHAT_EXPIRATION,
  CHAT_TOTALCOUNT,
} from '../../utils/constants.js';

const apiMocks = vi.hoisted(() => ({
  fetchSessionServer: vi.fn(),
  sendChatTurnServer: vi.fn(),
  continueChatMessageServer: vi.fn(),
  updateMessageReview: vi.fn(),
}));

vi.mock('../../api/chat/session', () => ({
  fetchSessionServer: apiMocks.fetchSessionServer,
}));

vi.mock('../../api/chat/message', () => ({
  sendChatTurnServer: apiMocks.sendChatTurnServer,
  continueChatMessageServer: apiMocks.continueChatMessageServer,
  updateMessageReview: apiMocks.updateMessageReview,
}));

vi.mock('../../utils/userIdContext', () => ({
  useUserID: () => ({
    accessToken: 'access-token',
    updateAccessToken: vi.fn(),
  }),
}));

const session = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Existing chat',
};

const existingTurn = {
  turnSeq: 1,
  user: {
    message: 'Earlier question',
    messageId: 'user-1',
    messageSeq: 1,
    parentMessageId: '#ROOT',
  },
  ai: {
    message: 'Earlier answer',
    messageId: 'ai-1',
    messageSeq: 1,
    parentMessageId: 'user-1',
  },
};

function makeTurn(turnSeq, parentAiId = '#ROOT') {
  return {
    turnSeq,
    user: {
      message: `Question ${turnSeq}`,
      messageId: `user-${turnSeq}`,
      messageSeq: 1,
      parentMessageId: parentAiId,
    },
    ai: {
      message: `Answer ${turnSeq}`,
      messageId: `ai-${turnSeq}`,
      messageSeq: 1,
      parentMessageId: `user-${turnSeq}`,
    },
  };
}

function streamedResponse(...events) {
  const encoder = new TextEncoder();

  return {
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(events.map((event) => JSON.stringify(event)).join('\n')),
        );
        controller.close();
      },
    }),
  };
}

describe('chat message sending', () => {
  let originalRandomUUID;

  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    apiMocks.fetchSessionServer.mockResolvedValue({
      messages: [existingTurn],
      lastKey: null,
    });
    apiMocks.sendChatTurnServer.mockResolvedValue(
      streamedResponse({
        type: 'final',
        content: {
          turnSeq: 2,
          title: session.title,
          user: {
            message: 'Hello from Vite',
            messageId: 'user-2',
            messageSeq: 1,
            parentMessageId: 'ai-1',
          },
          ai: {
            message: 'Streamed answer',
            messageId: 'ai-2',
            messageSeq: 1,
            parentMessageId: 'user-2',
          },
        },
      }),
    );
    apiMocks.continueChatMessageServer.mockResolvedValue(
      streamedResponse({
        type: 'continuation',
        turnSeq: 2,
        content: {
          format: 'blocks_v1',
          blocks: [
            { type: 'p', text: 'Continued answer', items: [] },
          ],
        },
        continuation: null,
      }),
    );
    apiMocks.updateMessageReview.mockResolvedValue({ ok: true });

    originalRandomUUID = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: originalRandomUUID,
    });
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test('sends from a non-secure Vite LAN origin and renders the streamed reply', async () => {
    render(
      <MemoryRouter>
        <Chat
          setSuccessMessage={vi.fn()}
          setErrorMessage={vi.fn()}
          session={session}
          setSessions={vi.fn()}
          skipPageFetch={false}
          setSkipPageFetch={vi.fn()}
          newChat={false}
          sessionId={session.id}
          catalogDict={{}}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    await screen.findByText('Earlier answer');

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Hello from Vite' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(apiMocks.sendChatTurnServer).toHaveBeenCalledOnce();
    });

    const [sessionId, turn, accessToken] =
      apiMocks.sendChatTurnServer.mock.calls[0];

    expect(sessionId).toBe(session.id);
    expect(turn.turnSeq).toBe(2);
    expect(turn.user.message).toBe('Hello from Vite');
    expect(turn.user.messageId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(accessToken).toBe('access-token');
    expect(apiMocks.sendChatTurnServer.mock.calls[0][6]).toBe(false);
    expect(await screen.findByText('Streamed answer')).toBeInTheDocument();
  });

  test('synchronizes manually edited or deleted chat-limit storage', async () => {
    const oneHourFromNow = Math.floor(Date.now() / 1000) + 60 * 60;
    window.localStorage.setItem(CHAT_TOTALCOUNT, '13');
    window.localStorage.setItem(CHAT_EXPIRATION, String(oneHourFromNow));

    render(
      <MemoryRouter>
        <Chat
          setSuccessMessage={vi.fn()}
          setErrorMessage={vi.fn()}
          session={session}
          setSessions={vi.fn()}
          skipPageFetch={false}
          setSkipPageFetch={vi.fn()}
          newChat={false}
          sessionId={session.id}
          catalogDict={{}}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/7 messages left/)).toBeInTheDocument();

    window.localStorage.setItem(CHAT_TOTALCOUNT, '19');
    window.dispatchEvent(new Event('focus'));
    expect(await screen.findByText(/1 message left/)).toBeInTheDocument();

    window.localStorage.removeItem(CHAT_TOTALCOUNT);
    window.localStorage.removeItem(CHAT_EXPIRATION);
    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      expect(screen.queryByText(/message left/)).not.toBeInTheDocument();
    });
  });

  test('occasionally asks for feedback on a completed response', async () => {
    Math.random.mockReturnValue(0.1);

    render(
      <MemoryRouter>
        <Chat
          setSuccessMessage={vi.fn()}
          setErrorMessage={vi.fn()}
          session={session}
          setSessions={vi.fn()}
          skipPageFetch={false}
          setSkipPageFetch={vi.fn()}
          newChat={false}
          sessionId={session.id}
          catalogDict={{}}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('link', { name: 'Found a Bug?' }),
    ).toHaveAttribute('href', '/support?topic=bug');

    await screen.findByText('Earlier answer');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Please answer this' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(
      await screen.findByText('Help us improve: was this response helpful?'),
    ).toBeInTheDocument();

    const likeButtons = screen.getAllByRole('button', { name: 'Like' });
    fireEvent.click(likeButtons[likeButtons.length - 1]);

    await waitFor(() => {
      expect(apiMocks.updateMessageReview).toHaveBeenCalledWith(
        'like',
        session.id,
        'ai-2',
        'access-token',
        expect.any(Function),
      );
    });
    expect(
      screen.queryByText('Help us improve: was this response helpful?'),
    ).not.toBeInTheDocument();
  });

  test('rewinds later turns when regenerating and continues from the regenerated reply', async () => {
    const turns = [
      makeTurn(1),
      makeTurn(2, 'ai-1'),
      makeTurn(3, 'ai-2'),
    ];
    const regeneratedTurn = {
      ...turns[1],
      ai: {
        ...turns[1].ai,
        message: 'Regenerated answer 2',
        messageId: 'ai-2-regenerated',
        prevMessageId: 'ai-2',
      },
    };
    const followUpTurn = {
      turnSeq: 3,
      title: session.title,
      user: {
        message: 'Follow-up after rewind',
        messageId: 'user-3-new',
        messageSeq: 1,
        parentMessageId: 'ai-2-regenerated',
      },
      ai: {
        message: 'Follow-up answer',
        messageId: 'ai-3-new',
        messageSeq: 1,
        parentMessageId: 'user-3-new',
      },
    };

    apiMocks.fetchSessionServer.mockResolvedValue({
      messages: turns,
      lastKey: null,
    });
    apiMocks.sendChatTurnServer
      .mockReset()
      .mockResolvedValueOnce(
        streamedResponse({ type: 'final', content: regeneratedTurn }),
      )
      .mockResolvedValueOnce(
        streamedResponse({ type: 'final', content: followUpTurn }),
      );

    render(
      <MemoryRouter>
        <Chat
          setSuccessMessage={vi.fn()}
          setErrorMessage={vi.fn()}
          session={session}
          setSessions={vi.fn()}
          skipPageFetch={false}
          setSkipPageFetch={vi.fn()}
          newChat={false}
          sessionId={session.id}
          catalogDict={{}}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    await screen.findByText('Answer 3');
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Try again...' })[1],
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    expect(await screen.findByText('Regenerated answer 2')).toBeInTheDocument();
    expect(screen.queryByText('Question 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Answer 3')).not.toBeInTheDocument();

    const regeneratedRequest = apiMocks.sendChatTurnServer.mock.calls[0][1];
    expect(regeneratedRequest.turnSeq).toBe(2);
    expect(regeneratedRequest.user.messageId).toBe('user-2');
    expect(regeneratedRequest.ai.parentMessageId).toBe('user-2');
    expect(regeneratedRequest.ai.prevMessageId).toBe('ai-2');
    expect(apiMocks.sendChatTurnServer.mock.calls[0][5]).toBeNull();
    expect(apiMocks.sendChatTurnServer.mock.calls[0][6]).toBe(true);

    const sendButton = await screen.findByRole('button', {
      name: 'Send message',
    });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Follow-up after rewind' },
    });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(apiMocks.sendChatTurnServer).toHaveBeenCalledTimes(2);
    });

    const followUpRequest = apiMocks.sendChatTurnServer.mock.calls[1][1];
    expect(followUpRequest.turnSeq).toBe(3);
    expect(followUpRequest.user.parentMessageId).toBe('ai-2-regenerated');
    expect(apiMocks.sendChatTurnServer.mock.calls[1][6]).toBe(false);
    expect(await screen.findByText('Follow-up answer')).toBeInTheDocument();
  });

  test('links an errored AI message to its regenerated replacement', async () => {
    const failedTurn = {
      ...existingTurn,
      ai: {
        ...existingTurn.ai,
        message: 'Having trouble connecting...',
        messageId: 'ai-failed',
        prevMessageId: 'ai-before-failed',
        error: true,
      },
    };
    const recoveredTurn = {
      ...failedTurn,
      ai: {
        ...failedTurn.ai,
        message: 'Recovered answer',
        messageId: 'ai-recovered',
        prevMessageId: 'ai-failed',
        error: false,
      },
    };

    apiMocks.fetchSessionServer.mockResolvedValue({
      messages: [failedTurn],
      lastKey: null,
    });
    apiMocks.sendChatTurnServer.mockReset().mockResolvedValue(
      streamedResponse({ type: 'final', content: recoveredTurn }),
    );

    render(
      <MemoryRouter>
        <Chat
          setSuccessMessage={vi.fn()}
          setErrorMessage={vi.fn()}
          session={session}
          setSessions={vi.fn()}
          skipPageFetch={false}
          setSkipPageFetch={vi.fn()}
          newChat={false}
          sessionId={session.id}
          catalogDict={{}}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    await screen.findByText('Having trouble connecting...');
    fireEvent.click(screen.getByRole('button', { name: 'Try again...' }));

    await waitFor(() => {
      expect(apiMocks.sendChatTurnServer).toHaveBeenCalledOnce();
    });
    expect(
      apiMocks.sendChatTurnServer.mock.calls[0][1].ai.prevMessageId,
    ).toBe('ai-failed');
    expect(await screen.findByText('Recovered answer')).toBeInTheDocument();
  });

  test('regenerates using only the selected alternative rank', async () => {
    const rankedTurn = {
      ...existingTurn,
      user: {
        ...existingTurn.user,
        alternativeModels: [
          { rank: '1', model: 'best-model' },
          { rank: '2', model: 'second-model' },
          { rank: '3', model: 'third-model' },
        ],
      },
      ai: {
        ...existingTurn.ai,
        model: 'different-model',
      },
    };
    const regeneratedTurn = {
      ...rankedTurn,
      ai: {
        ...rankedTurn.ai,
        message: 'Answer from the alternative',
        messageId: 'ai-1-alternative',
      },
    };

    apiMocks.fetchSessionServer.mockResolvedValue({
      messages: [rankedTurn],
      lastKey: null,
    });
    apiMocks.sendChatTurnServer.mockReset().mockResolvedValue(
      streamedResponse({ type: 'final', content: regeneratedTurn }),
    );

    render(
      <MemoryRouter>
        <Chat
          setSuccessMessage={vi.fn()}
          setErrorMessage={vi.fn()}
          session={session}
          setSessions={vi.fn()}
          skipPageFetch={false}
          setSkipPageFetch={vi.fn()}
          newChat={false}
          sessionId={session.id}
          catalogDict={{
            'best-model': 'Best model',
            'second-model': 'Second ranked model',
            'third-model': 'Third ranked model',
            'different-model': 'Different model',
          }}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    await screen.findByText('Earlier answer');
    fireEvent.click(screen.getByRole('button', { name: 'Try again...' }));

    expect(
      screen.getByRole('menuitem', { name: 'Best model' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Second ranked model' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Third ranked model' }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Second ranked model' }),
    );

    await waitFor(() => {
      expect(apiMocks.sendChatTurnServer).toHaveBeenCalledOnce();
    });
    expect(apiMocks.sendChatTurnServer.mock.calls[0][5]).toBe(2);
    expect(apiMocks.sendChatTurnServer.mock.calls[0][6]).toBe(true);
    expect(
      apiMocks.sendChatTurnServer.mock.calls[0][1].user,
    ).not.toHaveProperty('alternativeModels');
    expect(await screen.findByText('Answer from the alternative')).toBeInTheDocument();
  });

  test('uses rankings stored on user data in the final turn', async () => {
    apiMocks.sendChatTurnServer.mockResolvedValue(
      streamedResponse({
        type: 'final',
        content: {
          turnSeq: 2,
          title: session.title,
          user: {
            message: 'Show streamed options',
            messageId: 'user-2',
            messageSeq: 1,
            parentMessageId: 'ai-1',
            alternativeModels: [
              { rank: 1, model: 'streamed-best' },
              { rank: 2, model: 'streamed-second' },
            ],
          },
          ai: {
            message: 'Answer with alternatives',
            messageId: 'ai-2',
            messageSeq: 1,
            parentMessageId: 'user-2',
            model: 'streamed-best',
          },
        },
      }),
    );

    render(
      <MemoryRouter>
        <Chat
          setSuccessMessage={vi.fn()}
          setErrorMessage={vi.fn()}
          session={session}
          setSessions={vi.fn()}
          skipPageFetch={false}
          setSkipPageFetch={vi.fn()}
          newChat={false}
          sessionId={session.id}
          catalogDict={{
            'streamed-best': 'Streamed best model',
            'streamed-second': 'Streamed second model',
          }}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    await screen.findByText('Earlier answer');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Show streamed options' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await screen.findByText('Answer with alternatives');
    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: 'Try again...' }),
      ).toHaveLength(2);
    });
    const tryAgainButtons = screen.getAllByRole('button', {
      name: 'Try again...',
    });
    fireEvent.click(tryAgainButtons[tryAgainButtons.length - 1]);

    expect(
      screen.getByRole('menuitem', { name: 'Streamed second model' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Streamed best model' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Try again...' }));

    await waitFor(() => {
      expect(apiMocks.sendChatTurnServer).toHaveBeenCalledTimes(2);
    });
    expect(apiMocks.sendChatTurnServer.mock.calls[1][5]).toBe(1);
  });

  test('stops an active response without reporting a network error', async () => {
    const cancelStream = vi.fn();
    const encoder = new TextEncoder();
    const response = {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                type: 'status',
                content: 'Starting chat request',
              })}\n`,
            ),
          );
        },
        cancel: cancelStream,
      }),
    };

    apiMocks.sendChatTurnServer.mockReset().mockResolvedValue(response);

    render(
      <MemoryRouter>
        <Chat
          setSuccessMessage={vi.fn()}
          setErrorMessage={vi.fn()}
          session={session}
          setSessions={vi.fn()}
          skipPageFetch={false}
          setSkipPageFetch={vi.fn()}
          newChat={false}
          sessionId={session.id}
          catalogDict={{}}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    await screen.findByText('Earlier answer');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Please stop this response' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await screen.findByText('Starting chat request');
    const signal = apiMocks.sendChatTurnServer.mock.calls[0][4];
    expect(signal.aborted).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Stop generating' }));

    expect(await screen.findByText('Response stopped.')).toBeInTheDocument();
    expect(signal.aborted).toBe(true);
    expect(cancelStream).toHaveBeenCalledOnce();
    expect(screen.queryByText('Having trouble connecting...')).not.toBeInTheDocument();
    const sendButton = await screen.findByRole('button', {
      name: 'Send message',
    });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'A new prompt' },
    });
    expect(sendButton).toBeEnabled();
  });

  test('replaces a partial block with the canonical seamless continuation', async () => {
    apiMocks.sendChatTurnServer.mockReset().mockResolvedValue(
      streamedResponse({
        type: 'final',
        continuation: {
          id: '22222222-2222-4222-8222-222222222222',
          expiresAt: 9_999_999_999,
        },
        content: {
          turnSeq: 2,
          title: session.title,
          user: {
            message: 'Give me a long answer',
            messageId: 'user-2',
            messageSeq: 1,
            parentMessageId: 'ai-1',
          },
          ai: {
            message: {
              format: 'blocks_v1',
              blocks: [
                { type: 'p', text: 'First partial answer', items: [] },
              ],
            },
            messageId: 'ai-2',
            messageSeq: 1,
            parentMessageId: 'user-2',
          },
        },
      }),
    );
    apiMocks.continueChatMessageServer.mockReset().mockResolvedValue(
      streamedResponse({
        type: 'continuation',
        turnSeq: 2,
        replace: true,
        content: {
          format: 'blocks_v1',
          blocks: [
            {
              type: 'p',
              text: 'First partial answer continued seamlessly',
              items: [],
            },
          ],
        },
        continuation: null,
      }),
    );

    render(
      <MemoryRouter>
        <Chat
          setSuccessMessage={vi.fn()}
          setErrorMessage={vi.fn()}
          session={session}
          setSessions={vi.fn()}
          skipPageFetch={false}
          setSkipPageFetch={vi.fn()}
          newChat={false}
          sessionId={session.id}
          catalogDict={{}}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    await screen.findByText('Earlier answer');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Give me a long answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('First partial answer')).toBeInTheDocument();
    const continueButton = screen.getByRole('button', { name: 'Continue response' });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(apiMocks.continueChatMessageServer).toHaveBeenCalledOnce();
    });

    expect(await screen.findByText('First partial answer continued seamlessly'))
      .toBeInTheDocument();
    expect(apiMocks.continueChatMessageServer).toHaveBeenCalledWith(
      session.id,
      '22222222-2222-4222-8222-222222222222',
      'access-token',
      expect.any(Function),
      expect.any(AbortSignal),
    );
    expect(screen.queryByText('First partial answer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue response' }))
      .not.toBeInTheDocument();
  });
});
