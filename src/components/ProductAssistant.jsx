import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { askProductAssistant } from "../services/assistant.js";

const suggestedQuestions = [
  "What should I know about this product?",
  "How do I use or care for it?",
  "What details are available about its ingredients or materials?",
];

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
      const answer = await askProductAssistant(product.slug, [
        ...messages,
        { role: "user", content: text },
      ]);
      setMessages((current) => [
        ...current,
        { role: "user", content: text },
        { role: "assistant", content: answer },
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
      <div className="assistant-heading">
        <span className="assistant-icon">
          <Bot size={19} />
        </span>
        <div>
          <span className="eyebrow">PERSONAL PRODUCT HELP</span>
          <h2 id="assistant-title">Ask about {product.name}</h2>
        </div>
      </div>
      <p className="assistant-intro">
        Get answers about this product. The assistant will let you know when
        specific information is not available.
      </p>
      <div className="assistant-messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="assistant-welcome">
            Hi! What would you like to know about {product.name}?
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              className={`assistant-message assistant-message-${message.role}`}
              key={`${index}-${message.role}`}
            >
              {message.content}
            </div>
          ))
        )}
        {pending && (
          <div className="assistant-message assistant-message-assistant">
            Thinking…
          </div>
        )}
      </div>
      {!messages.length && (
        <div className="assistant-suggestions">
          {suggestedQuestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
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
          placeholder="Ask a question about this product…"
          disabled={pending}
        />
        <button
          className="button button-dark"
          type="submit"
          aria-label="Send question"
          disabled={!question.trim() || pending}
        >
          <Send size={16} />
          Ask
        </button>
      </form>
      <small className="assistant-disclaimer">
        AI answers may not cover every detail. Please check the product
        information or contact us if you need confirmation.
      </small>
    </section>
  );
}
