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

function chunkedStreamResponse(events, chunkSize = 7) {
  const encoder = new TextEncoder();
  const payload = events.map((event) => JSON.stringify(event)).join('\n');

  return {
    body: new ReadableStream({
      start(controller) {
        for (let offset = 0; offset < payload.length; offset += chunkSize) {
          controller.enqueue(encoder.encode(payload.slice(offset, offset + chunkSize)));
        }
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
    apiMocks.sendChatTurnServer.mockImplementation(() => Promise.resolve(
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
    ));
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

  test('links an edited user message to the previous user message', async () => {
    apiMocks.sendChatTurnServer.mockResolvedValueOnce(
      streamedResponse({
        type: 'final',
        content: {
          turnSeq: 1,
          title: session.title,
          user: {
            message: 'Edited question',
            messageId: 'user-1-edited',
            messageSeq: 2,
            parentMessageId: '#ROOT',
            prevMessageId: 'user-1',
          },
          ai: {
            message: 'Answer to edited question',
            messageId: 'ai-1-edited',
            messageSeq: 1,
            parentMessageId: 'user-1-edited',
            prevMessageId: '',
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
          catalogDict={{}}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    await screen.findByText('Earlier answer');
    fireEvent.click(screen.getByText('Edit').closest('button'));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Edited question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(apiMocks.sendChatTurnServer).toHaveBeenCalledOnce();
    });

    const request = apiMocks.sendChatTurnServer.mock.calls[0][1];
    expect(request.turnSeq).toBe(1);
    expect(request.user.message).toBe('Edited question');
    expect(request.user.messageId).not.toBe('user-1');
    expect(request.user.messageSeq).toBe(2);
    expect(request.user.parentMessageId).toBe('#ROOT');
    expect(request.user.prevMessageId).toBe('user-1');
    expect(request.ai.messageSeq).toBe(1);
    expect(request.ai.parentMessageId).toBe(request.user.messageId);
    expect(request.ai.prevMessageId).toBe('');
    expect(apiMocks.sendChatTurnServer.mock.calls[0][6]).toBe(false);
    expect(await screen.findByText('Answer to edited question')).toBeInTheDocument();
  });

  test('cancels editing without sending the edited message', async () => {
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
    fireEvent.click(screen.getByText('Edit').closest('button'));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Do not send this edit' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel edit' }));

    expect(apiMocks.sendChatTurnServer).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Cancel edit' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');
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
      user: {
        ...existingTurn.user,
        alternativeModels: [
          { rank: 1, model: 'failed-model' },
          { rank: 2, model: 'fallback-model' },
        ],
      },
      ai: {
        ...existingTurn.ai,
        message: 'Having trouble connecting...',
        messageId: 'ai-failed',
        prevMessageId: 'ai-before-failed',
        model: 'failed-model',
        error: true,
      },
    };
    const recoveredTurn = {
      ...failedTurn,
      ai: {
        ...failedTurn.ai,
        message: 'Recovered answer',
        messageId: 'ai-recovered',
        prevMessageId: 'ai-before-failed',
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
          catalogDict={{
            'failed-model': 'Failed model',
            'fallback-model': 'Fallback model',
          }}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    await screen.findByText('Having trouble connecting...');
    fireEvent.click(screen.getByRole('button', { name: 'Try again...' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.sendChatTurnServer).toHaveBeenCalledOnce();
    });
    expect(
      apiMocks.sendChatTurnServer.mock.calls[0][1].ai.prevMessageId,
    ).toBe('ai-before-failed');
    expect(apiMocks.sendChatTurnServer.mock.calls[0][5]).toBeNull();
    expect(apiMocks.sendChatTurnServer.mock.calls[0][6]).toBe(true);
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
    apiMocks.sendChatTurnServer.mockImplementation(() => Promise.resolve(
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
    ));

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

    expect(
      await screen.findByText('Message generation stopped.'),
    ).toBeInTheDocument();
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

  test('prevents calling the backend before session initialization', async () => {
    render(
      <MemoryRouter>
        <Chat
          setSuccessMessage={vi.fn()}
          setErrorMessage={vi.fn()}
          session={null}
          setSessions={vi.fn()}
          skipPageFetch={false}
          setSkipPageFetch={vi.fn()}
          newChat={false}
          sessionId={null}
          catalogDict={{}}
          trainingState={false}
          setTrainingState={vi.fn()}
          modelLabelsById={{}}
        />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Sent before startup completes' },
    });
    const sendButton = screen.getByRole('button', { name: 'Send message' });

    expect(sendButton).toBeDisabled();
    fireEvent.click(sendButton);
    expect(apiMocks.sendChatTurnServer).not.toHaveBeenCalled();
  });

  test('keeps a persisted partial response when the final event is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    apiMocks.fetchSessionServer.mockResolvedValue({
      messages: [makeTurn(1), makeTurn(2, 'ai-1'), makeTurn(3, 'ai-2')],
      lastKey: null,
    });
    apiMocks.sendChatTurnServer.mockResolvedValue(
      streamedResponse({
        type: 'partial',
        content: {
          format: 'blocks_v1',
          blocks: [{ type: 'p', text: 'Persisted partial response', items: [] }],
        },
        turn: {
          turnSeq: 4,
          title: session.title,
          user: {
            message: 'Test a dropped final event',
            messageId: 'user-4',
            messageSeq: 1,
            parentMessageId: 'ai-3',
          },
          ai: {
            message: {
              format: 'blocks_v1',
              blocks: [
                { type: 'p', text: 'Persisted partial response', items: [] },
              ],
            },
            messageId: 'ai-4',
            messageSeq: 1,
            parentMessageId: 'user-4',
            model: 'gpt-5-6-terra',
          },
        },
        request: { total: 5, expires: 9_999_999_999 },
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

    await screen.findByText('Answer 3');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Test a dropped final event' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Persisted partial response')).toBeInTheDocument();
    expect(screen.queryByText('Having trouble connecting...')).not.toBeInTheDocument();
  });

  test('recovers a persisted response after the stream closes early', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const initialTurns = [makeTurn(1), makeTurn(2, 'ai-1'), makeTurn(3, 'ai-2')];
    const recoveredTurn = {
      turnSeq: 4,
      title: session.title,
      user: {
        message: 'Recover this response',
        messageId: '',
        messageSeq: 1,
        parentMessageId: 'ai-3',
      },
      ai: {
        message: 'Recovered from persisted history',
        messageId: 'ai-4',
        messageSeq: 1,
        parentMessageId: '',
        model: 'gpt-5-6-terra',
      },
    };
    apiMocks.fetchSessionServer
      .mockResolvedValueOnce({ messages: initialTurns, lastKey: null })
      .mockImplementationOnce(async () => {
        const sentMessageId =
          apiMocks.sendChatTurnServer.mock.calls[0][1].user.messageId;
        return {
          messages: [{
            ...recoveredTurn,
            user: { ...recoveredTurn.user, messageId: sentMessageId },
            ai: { ...recoveredTurn.ai, parentMessageId: sentMessageId },
          }],
          lastKey: null,
        };
      });
    apiMocks.sendChatTurnServer.mockResolvedValue(streamedResponse());

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
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Recover this response' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Recovered from persisted history'))
      .toBeInTheDocument();
    expect(apiMocks.fetchSessionServer).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Having trouble connecting...')).not.toBeInTheDocument();
  });

  test('handles status, heartbeat, and final events split across network chunks', async () => {
    apiMocks.fetchSessionServer.mockResolvedValue({
      messages: [makeTurn(1), makeTurn(2, 'ai-1'), makeTurn(3, 'ai-2')],
      lastKey: null,
    });
    apiMocks.sendChatTurnServer.mockResolvedValue(
      chunkedStreamResponse([
        { type: 'status', content: 'Selecting Model' },
        { type: 'heartbeat', stage: 'generating', elapsed: 15 },
        {
          type: 'final',
          content: {
            turnSeq: 4,
            title: session.title,
            user: {
              message: 'Chunk the stream',
              messageId: 'user-4',
              messageSeq: 1,
              parentMessageId: 'ai-3',
            },
            ai: {
              message: 'Chunked response completed',
              messageId: 'ai-4',
              messageSeq: 1,
              parentMessageId: 'user-4',
            },
          },
        },
      ]),
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
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Chunk the stream' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Chunked response completed'))
      .toBeInTheDocument();
    expect(screen.queryByText('Having trouble connecting...')).not.toBeInTheDocument();
  });
});
