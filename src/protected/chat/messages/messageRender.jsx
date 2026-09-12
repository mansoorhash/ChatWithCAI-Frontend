import React, {useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, CopyCheck } from 'lucide-react';
import copyToClipboard from './utils/copyToClipboard';
import './messageRender.css';
import "./messageActions.css";

const NUMBERED_ITEM_PATTERN = /^\s*(\d+)[.)]\s+([\s\S]+)$/;

function parseNumberedItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const parsed = items.map((item) => {
    if (typeof item !== 'string') return null;
    const match = item.match(NUMBERED_ITEM_PATTERN);
    if (!match) return null;

    const value = Number.parseInt(match[1], 10);
    if (!Number.isSafeInteger(value) || value < 1) return null;
    return { value, text: match[2] };
  });

  return parsed.every(Boolean) ? parsed : null;
}

export default function MessageRender({ speaker, data, messageProcessing, stopped}) {
  const isAi = speaker === 'ai';
  const content = data?.message ?? "Loading";

  const [isCopied, setIsCopied] = useState(false);
  function MarkdownText({ children }) {
    const inline = ({ children }) => <>{children}</>;

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: inline,
          h1: inline,
          h2: inline,
          h3: inline,
          h4: inline,
          h5: inline,
          h6: inline,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {String(children ?? '').trim()}
      </ReactMarkdown>
    );
  }
  const handleCodeCopy = async (rawText) => {
    try {
        await copyToClipboard(rawText);

        setIsCopied(true);
        setTimeout(() => {
        setIsCopied(false);
        }, 2000)
    } catch (error) {
      console.error("Unable to copy code:", error);
    }
    };

  if (isAi && content?.format === 'blocks_v1' && Array.isArray(content?.blocks)) {
    return (
      <>
        {content.blocks.map((b, i) => {
          if (!b) return null;

          switch (b.type) {
            case 'h2':
              return (
                <div key={i} className="ai-h2">
                  <MarkdownText>{b.text}</MarkdownText>
                </div>
              );

            case 'h3':
              return (
                <div key={i} className="ai-h3">
                  <MarkdownText>{b.text}</MarkdownText>
                </div>
              );

            case 'p':
              return (
                <div key={i} className="ai-p">
                  <MarkdownText>{b.text}</MarkdownText>
                </div>
              );

            case 'bullets':
              {
                const numberedItems = parseNumberedItems(b.items);
                if (numberedItems) {
                  return (
                    <ol
                      key={i}
                      className="ai-bullets ai-numbered-bullets"
                      start={numberedItems[0].value}
                    >
                      {numberedItems.map((item, j) => (
                        <li key={j} value={item.value}>
                          <MarkdownText>{item.text}</MarkdownText>
                        </li>
                      ))}
                    </ol>
                  );
                }

                return (
                  <ul key={i} className="ai-bullets">
                    {b.items?.map((item, j) => (
                      <li key={j}>
                        <MarkdownText>{item}</MarkdownText>
                      </li>
                    ))}
                  </ul>
                );
              }

            case 'code':
              return (
                <pre key={i} className="ai-code">
                  <div className="code-header">
                    <div className="code-header-right">
                      <button
                        type="button"
                        disabled={isCopied}
                        className="ds-icon tooltip-wrapper"
                        onClick={() => handleCodeCopy(b?.text)}
                      >
                        {isCopied ? (
                          <CopyCheck size={16} />
                        ) : (
                          <Copy size={16} />
                        )}

                        <span className="ds-tooltip">
                          {isCopied ? 'Copied' : 'Copy'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <code className='scrollbar-custom'>{b.text}</code>
                </pre>
              );

            default:
              return null;
          }
        })}
      </>
    );
  }

  return (
    <div
      className={`message-text ${
        isAi && messageProcessing || stopped ? "processing-status" : ""
      }`}
    >
      {String(content)}
    </div>
  );
}
