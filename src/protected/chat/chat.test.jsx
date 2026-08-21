import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Chat from './chat.jsx';

const apiMocks = vi.hoisted(() => ({
  fetchSessionServer: vi.fn(),
  sendChatTurnServer: vi.fn(),
  continueChatMessageServer: vi.fn(),
}));

vi.mock('../../api/chat/session', () => ({
  fetchSessionServer: apiMocks.fetchSessionServer,
}));

vi.mock('../../api/chat/message', () => ({
  sendChatTurnServer: apiMocks.sendChatTurnServer,
  continueChatMessageServer: apiMocks.continueChatMessageServer,
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
    expect(await screen.findByText('Streamed answer')).toBeInTheDocument();
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

    expect(await screen.findByText('Regenerated answer 2')).toBeInTheDocument();
    expect(screen.queryByText('Question 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Answer 3')).not.toBeInTheDocument();

    const regeneratedRequest = apiMocks.sendChatTurnServer.mock.calls[0][1];
    expect(regeneratedRequest.turnSeq).toBe(2);
    expect(regeneratedRequest.user.messageId).toBe('user-2');
    expect(regeneratedRequest.ai.parentMessageId).toBe('user-2');
    expect(regeneratedRequest.ai.prevMessageId).toBe('ai-2');

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
    expect(await screen.findByText('Follow-up answer')).toBeInTheDocument();
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

  test('appends a continuation to the same visible AI message', async () => {
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

    expect(await screen.findByText('Continued answer')).toBeInTheDocument();
    expect(apiMocks.continueChatMessageServer).toHaveBeenCalledWith(
      session.id,
      '22222222-2222-4222-8222-222222222222',
      'access-token',
      expect.any(Function),
      expect.any(AbortSignal),
    );
    expect(screen.getByText('First partial answer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue response' }))
      .not.toBeInTheDocument();
  });
});
