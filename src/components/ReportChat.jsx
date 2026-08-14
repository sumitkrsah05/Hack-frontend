import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { Bot, Loader2, MessageSquareText, Send, Trash2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { blueApi } from "@/lib/blueApi";
import { cn } from "@/lib/utils";

// Keep the report context inside a safe prompt budget.
const MAX_CONTEXT_CHARS = 60000;
// Only the most recent exchanges are replayed to the LLM.
const HISTORY_TURNS = 6;

const SUGGESTIONS = [
  "Summarize this report in simple terms",
  "Which findings should I fix first and why?",
  "What is the overall risk and how was it derived?",
  "List the affected assets and their severities",
];

function buildPrompt(reportJson, history, question) {
  const turns = history
    .slice(-HISTORY_TURNS * 2)
    .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
    .join("\n");
  return [
    "You are a security analyst assistant embedded in a report viewer of a red/blue team security platform.",
    "Answer the user's question strictly using the report data below.",
    "If the answer is not present in the report, say that the report does not contain that information — never invent findings, scores or numbers.",
    "Be concise and precise. Use markdown (short bullet lists, bold severities) when it helps readability.",
    "",
    "=== REPORT DATA (JSON) ===",
    reportJson,
    "=== END REPORT DATA ===",
    turns ? `\nConversation so far:\n${turns}` : "",
    `\nUSER QUESTION: ${question}`,
  ].join("\n");
}

function ChatMessage({ role, content, error }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-sm border px-3 py-2 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]",
          isUser
            ? "border-accent/40 bg-accent/10 text-foreground"
            : error
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-border/25 bg-secondary/40 text-foreground/85"
        )}
      >
        {isUser || error ? (
          content
        ) : (
          <div className="chat-markdown space-y-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mt-1 [&_strong]:text-accent [&_code]:text-primary [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_p+p]:mt-2">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Right-side chat drawer for asking questions about a generated report.
 *
 * With `jobId` set, questions go to the Blue Agent's per-analysis chat
 * endpoint (POST /api/v1/analyses/{job_id}/chat) — the server grounds replies
 * in that job's report, so nothing is inlined into the prompt. The endpoint is
 * stateless: we replay the `history` it returned on every turn. Without
 * `jobId` it falls back to base44 InvokeLLM with the report JSON as context.
 *
 * Renders nothing until `report` (or `jobId`) is available.
 */
export default function ReportChat({ report, label = "report", jobId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  // Server-side transcript, stored verbatim between turns (jobId mode only).
  const historyRef = useRef([]);

  const reportJson = useMemo(() => {
    if (!report) return null;
    try {
      const full = JSON.stringify(report);
      return full.length > MAX_CONTEXT_CHARS
        ? full.slice(0, MAX_CONTEXT_CHARS) + "\n…[report truncated for length]"
        : full;
    } catch {
      return null;
    }
  }, [report]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!reportJson && !jobId) return null;

  const ask = async (question) => {
    const q = (question || "").trim();
    if (!q || busy) return;
    setInput("");
    const history = messages.filter((m) => !m.error);
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setBusy(true);
    try {
      let answer;
      if (jobId) {
        // Backend keeps only user/assistant turns; message is capped at 8k chars.
        const res = await blueApi.chat(jobId, q.slice(0, 8000), historyRef.current);
        historyRef.current = res?.history || [];
        answer = res?.reply || "";
      } else {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: buildPrompt(reportJson, history, q),
        });
        answer = typeof res === "string" ? res : JSON.stringify(res, null, 2);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (e) {
      const detail =
        e?.status === 409
          ? "analysis is still running — retry once it completes"
          : e?.message || "LLM unavailable";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", error: true, content: `query failed — ${detail}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    ask(input);
  };

  // Portaled to <body>: the Layout page wrapper keeps a persistent transform
  // (float-up animation, fill-mode both), which would otherwise hijack
  // position:fixed and pin the panel to the scrolling page instead of the
  // viewport.
  return createPortal(
    <>
      {/* Floating toggle */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="ask about this report"
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-accent/50 bg-[#0F1419] font-mono text-[11px] uppercase tracking-[0.14em] text-accent glow-accent hover:bg-accent/10 transition-all"
        >
          <MessageSquareText className="w-4 h-4" /> ASK REPORT
        </button>
      )}

      {/* Backdrop on small screens */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Right-side chat panel */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 h-dvh w-full sm:w-[380px] flex flex-col",
          "bg-[#0F1419] border-l border-border/25 shadow-[0_0_32px_rgba(0,0,0,0.6)]",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 shrink-0">
          <Bot className="w-4 h-4 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
              report q&amp;a
            </div>
            <div className="font-mono text-[10px] text-muted-foreground truncate">
              context: {label}
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                historyRef.current = [];
              }}
              title="clear conversation"
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            title="close"
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div>
              <p className="font-mono text-xs text-foreground/70 leading-relaxed mb-4">
                {">"} report loaded into context. ask anything about the
                findings, risks or recommendations below.
              </p>
              <div className="space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    disabled={busy}
                    className="w-full text-left px-3 py-2 border border-border/20 rounded-sm font-mono text-[11px] text-muted-foreground hover:border-accent/40 hover:text-accent transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} {...m} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              analyzing report<span className="cursor-block ml-1" />
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 px-3 py-3 border-t border-border/20 shrink-0"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ask about this report…"
            disabled={busy}
            className="flex-1 min-w-0 bg-secondary/40 border border-border/25 rounded-sm px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/50 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            title="send"
            className="p-2 border border-accent/40 rounded-sm text-accent hover:bg-accent/10 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </aside>
    </>,
    document.body
  );
}
