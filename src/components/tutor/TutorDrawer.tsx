import { useEffect, useRef, useState } from 'react';
import { Brain, ChevronRight, X, Send, Loader2, MessageSquare, Lightbulb } from 'lucide-react';
import { useTutorStore, useUIStore } from '../../store';
import { TUTOR_BUTTON_ID, TUTOR_DRAWER_ID } from './TutorButton';
import type { FactsPacket, TutorMessage } from '../../types';

interface TutorDrawerProps {
  onAsk: (question: string) => void | Promise<void>;
}

function serialiseFacts(facts: FactsPacket) {
  return JSON.stringify(
    {
      action: facts.action,
      num_qubits: facts.num_qubits,
      probabilities: facts.probabilities,
      bloch: facts.bloch.map((b) => ({
        q: b.q,
        x: b.x.toFixed(2),
        y: b.y.toFixed(2),
        z: b.z.toFixed(2),
        purity: b.purity.toFixed(2),
      })),
      entangled_qubits: facts.entangled_qubits,
      changed_states: facts.changed_states,
      level: facts.level,
    },
    null,
    2
  );
}

function MessageEntry({ message }: { message: TutorMessage }) {
  const isQuestion = message.role === 'question';

  return (
    <article
      className={`rounded-xl border p-3 ${
        isQuestion ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'
      }`}
    >
      <header className="flex items-center gap-2 mb-1">
        {isQuestion ? (
          <MessageSquare className="w-4 h-4 text-muted" aria-hidden="true" />
        ) : (
          <Brain className="w-4 h-4 text-brand-text" aria-hidden="true" />
        )}
        <span className="text-label font-semibold uppercase tracking-wide text-muted">
          {isQuestion ? 'You' : 'Tutor'}
        </span>
        {message.isFallback && (
          <span className="px-1.5 py-0.5 text-label font-semibold rounded-full bg-orange-tint text-accent-text-orange">
            Offline template
          </span>
        )}
      </header>

      <p className="text-body-lg text-text whitespace-pre-wrap leading-relaxed">{message.text}</p>

      {message.facts && (
        <details className="group mt-2">
          <summary className="inline-flex items-center gap-1 text-label font-semibold text-brand-text cursor-pointer">
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
            What the tutor saw
          </summary>
          <pre className="mt-2 p-2 rounded-lg bg-gray-50 text-label font-mono text-muted overflow-x-auto">
            {serialiseFacts(message.facts)}
          </pre>
        </details>
      )}
    </article>
  );
}

/**
 * Non-modal right-side tutor drawer.
 *
 * It overlays the state panel rather than reflowing the canvas, so the circuit stays
 * interactive while it is open. Below 1024px it becomes a full-width bottom sheet.
 */
export function TutorDrawer({ onAsk }: TutorDrawerProps) {
  const isOpen = useUIStore((state) => state.tutorDrawerOpen);
  const setTutorDrawerOpen = useUIStore((state) => state.setTutorDrawerOpen);
  const toggleTutorDrawer = useUIStore((state) => state.toggleTutorDrawer);
  const level = useUIStore((state) => state.level);
  const messages = useTutorStore((state) => state.messages);
  const explanation = useTutorStore((state) => state.currentExplanation);
  const isStreaming = useTutorStore((state) => state.isStreaming);
  const markTutorRead = useTutorStore((state) => state.markTutorRead);

  const [question, setQuestion] = useState('');
  const drawerRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(isOpen);

  // Move focus into the drawer on open, and back to the navbar button on close.
  useEffect(() => {
    if (isOpen) {
      markTutorRead();
      drawerRef.current?.focus();
    } else if (wasOpenRef.current) {
      document.getElementById(TUTOR_BUTTON_ID)?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, markTutorRead, messages.length]);

  // Newest at the bottom.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, explanation, isStreaming, isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        // A docked tutor (>=1024px) is permanent: Esc must not close it.
        // Only the bottom-sheet mode below 1024px may be dismissed.
        const docked = window.matchMedia?.('(min-width: 1024px)').matches ?? false;
        if (docked) return;
        event.preventDefault();
        setTutorDrawerOpen(false);
        return;
      }
      if (event.key !== 't' && event.key !== 'T') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (isTyping) return;
      event.preventDefault();
      toggleTutorDrawer();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setTutorDrawerOpen, toggleTutorDrawer]);

  const handleAsk = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isStreaming) return;
    setQuestion('');
    void onAsk(trimmed);
  };

  const isEmpty = messages.length === 0 && !explanation;

  return (
    <aside
      id={TUTOR_DRAWER_ID}
      ref={drawerRef}
      role="complementary"
      aria-label="Tutor"
      tabIndex={-1}
      className={[
        // Below 1024px: full-width bottom sheet overlaying the canvas.
        'absolute z-40 inset-x-0 bottom-0 h-[70vh] border-t',
        // 1024px and up: a permanent dock in flow (the CSS variable
        // --tutor-drawer-width sizes it: 380px at >=1280, 320px below).
        'lg:static lg:z-auto lg:h-auto lg:border-t-0 lg:border-l lg:w-tutor',
        'flex flex-col bg-white shadow-2xl border-gray-200 outline-none',
        'transition-transform duration-drawer ease-out motion-reduce:transition-none',
        isOpen ? 'translate-x-0 translate-y-0' : 'translate-y-full lg:translate-y-0 lg:translate-x-full',
      ].join(' ')}
    >
      <header className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <Brain className="w-4 h-4 text-brand-text" aria-hidden="true" />
        <h2 className="text-body font-semibold text-text">Tutor</h2>
        <span className="px-2 py-0.5 text-label font-medium rounded-full bg-brand-tint text-brand-text">
          Level: {level === 'beginner' ? 'Beginner' : 'Intermediate'}
        </span>
        {isStreaming && (
          <Loader2 className="w-4 h-4 text-brand-text animate-spin ml-auto" aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={() => setTutorDrawerOpen(false)}
          className="ml-auto p-1.5 rounded-lg text-muted hover:bg-gray-200 hover:text-text transition-colors"
          aria-label="Close tutor"
          title="Close tutor (Esc)"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-live="polite"
        aria-label="Tutor explanations"
      >
        {isEmpty && (
          <div className="text-center py-8">
            <Lightbulb className="w-8 h-8 mx-auto text-muted" aria-hidden="true" />
            <p className="mt-2 text-body text-text font-medium">No explanations yet</p>
            <p className="mt-1 text-body text-muted">
              Drag a gate onto a wire to begin. The tutor explains every committed change.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageEntry key={message.id} message={message} />
        ))}

        {explanation && (
          <article className="rounded-xl border border-brand/20 bg-brand-tint p-3">
            <header className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-brand-text" aria-hidden="true" />
              <span className="text-label font-semibold uppercase tracking-wide text-brand-text">
                Tutor {isStreaming ? '(typing…)' : ''}
              </span>
            </header>
            <p className="text-body-lg text-text whitespace-pre-wrap leading-relaxed">
              {explanation}
              {isStreaming && <span className="typing-caret" aria-hidden="true" />}
            </p>
          </article>
        )}
      </div>

      <form onSubmit={handleAsk} className="p-3 border-t border-gray-200 bg-white shrink-0">
        <label htmlFor="tutor-question" className="sr-only">
          Ask the tutor a question
        </label>
        <div className="flex gap-2">
          <input
            id="tutor-question"
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about the circuit..."
            disabled={isStreaming}
            title={isStreaming ? 'Wait for the current explanation to finish' : 'Ask a follow-up question'}
            className="flex-1 px-3 py-2 text-body text-text bg-white border border-gray-300 rounded-lg placeholder:text-muted disabled:text-muted disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!question.trim() || isStreaming}
            title={question.trim() ? 'Send question' : 'Type a question first'}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}