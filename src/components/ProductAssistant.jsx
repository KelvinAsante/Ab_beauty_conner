import { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { askProductAssistant } from "../services/assistant.js";

const suggestedQuestions = [
  "What should I know about this product?",
  "How do I use or care for it?",
  "What should I know about shipping this product?",
];

function renderAssistantAnswer(content) {
  const parts = [];
  const links = content.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g);
  let offset = 0;
  for (const [markdown, label, url] of links) {
    const index = content.indexOf(markdown, offset);
    if (index > offset) parts.push(content.slice(offset, index));
    let destination = "";
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin) {
        destination = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      destination = "";
    }
    parts.push(
      destination ? (
        <Link
          className="assistant-inline-source"
          to={destination}
          key={`${index}-${url}`}
        >
          {label}
        </Link>
      ) : (
        label
      ),
    );
    offset = index + markdown.length;
  }
  if (offset < content.length) parts.push(content.slice(offset));
  return parts;
}

export function ProductAssistant({ product }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function sendQuestion(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || pending) return;

    setPending(true);
    setError("");
    try {
      const result = await askProductAssistant(product.slug, [
        ...messages,
        { role: "user", content: text },
      ]);
      setMessages((current) => [
        ...current,
        { role: "user", content: text },
        {
          role: "assistant",
          content: result.answer,
          sources: result.sources,
        },
      ]);
      setQuestion("");
    } catch (reason) {
      setError(reason.message || "Unable to contact the product assistant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="shell product-assistant"
      aria-labelledby="assistant-title"
    >
      <div className="assistant-panel">
        <div className="assistant-panel-heading">
          <span className="assistant-kicker">
            <Bot size={14} />
            PRODUCT ASSISTANT
          </span>
          <h2 id="assistant-title">A little more about {product.name}</h2>
          <p>Ask a question and get help choosing with confidence.</p>
        </div>
        <div className="assistant-messages" aria-live="polite">
          {messages.length === 0 ? (
            <div className="assistant-welcome">
              <span className="assistant-welcome-icon">
                <Sparkles size={15} />
              </span>
              <span>
                Welcome to AB Beauty Conner! I’m here to help with{" "}
                {product.name}. What would you like to know?
              </span>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                className={`assistant-message assistant-message-${message.role}`}
                key={`${index}-${message.role}`}
              >
                {message.role === "assistant"
                  ? renderAssistantAnswer(message.content)
                  : message.content}
                {message.sources?.length > 0 && (
                  <span className="assistant-sources">
                    <b>Sources</b>
                    {message.sources.map((source) => (
                      <span key={source.url}>
                        {source.title ||
                          source.url
                            .replace(/^https?:\/\/(?:www\.)?/i, "")
                            .split("/")[0]}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            ))
          )}
          {pending && (
            <div className="assistant-message assistant-message-assistant">
              Thinking…
            </div>
          )}
        </div>
        {error && (
          <p className="assistant-error" role="alert">
            {error}
          </p>
        )}
        <form className="assistant-form" onSubmit={sendQuestion}>
          <label className="sr-only" htmlFor={`product-question-${product.id}`}>
            Ask a question about {product.name}
          </label>
          <input
            id={`product-question-${product.id}`}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            placeholder="Ask us anything about this product…"
            disabled={pending}
          />
          <button
            className="assistant-send"
            type="submit"
            aria-label="Send question"
            disabled={!question.trim() || pending}
          >
            <Send size={17} />
          </button>
        </form>
        {!messages.length && (
          <div className="assistant-suggestions">
            <span>TRY ASKING</span>
            {suggestedQuestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setQuestion(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="assistant-disclaimer">
        AI answers may not cover every detail. Please check the product
        information or contact us if you need confirmation.
      </p>
    </section>
  );
}
