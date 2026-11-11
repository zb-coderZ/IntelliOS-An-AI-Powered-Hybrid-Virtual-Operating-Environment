import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  Copy,
  Check,
  BookOpen,
  Cpu,
  ShieldAlert,
  Layers,
  Terminal,
} from "lucide-react";

const API = "http://localhost:8000/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

const SUGGESTIONS = [
  {
    icon: Cpu,
    label: "Running Processes",
    prompt: "What processes are currently running?",
  },
  {
    icon: Cpu,
    label: "Round Robin Quantum",
    prompt: "Explain how time quantum size affects Round Robin CPU scheduling and context-switch overhead.",
  },
  {
    icon: ShieldAlert,
    label: "Banker's Algorithm",
    prompt: "How does Banker's Algorithm verify a safe state, and what are the 4 Coffman deadlock conditions?",
  },
  {
    icon: Layers,
    label: "Memory Fragmentation",
    prompt: "Compare First Fit, Best Fit, and Worst Fit memory allocation in terms of internal and external fragmentation.",
  },
  {
    icon: Terminal,
    label: "IntelliOS Architecture",
    prompt: "Explain the hybrid architecture of IntelliOS combining virtual OS simulators, WSL2 Ubuntu, and Windows telemetry.",
  },
  {
    icon: BookOpen,
    label: "Process Control Block",
    prompt: "What is a Process Control Block (PCB) and what happens during a CPU context switch?",
  },
];

export const IntelliAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m_welcome",
      sender: "ai",
      text: "👋 Hello! I am **IntelliAI**, your dedicated Operating Systems teaching assistant and viva preparation tutor.\n\nI can analyze simulation results from **IntelliLab**, explain scheduling algorithms, evaluate memory fragmentation, guide you through Banker's deadlock safety, or explain Linux and Windows telemetry.\n\nSelect a topic below or ask any OS question!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          id: `a_${Date.now()}`,
          sender: "ai",
          text: data.reply || "No response received.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error("HTTP " + res.status);
      }
    } catch {
      const fallbackMsg: Message = {
        id: `err_${Date.now()}`,
        sender: "ai",
        text: "⚠️ **Connection Notice**: Could not contact the local IntelliOS AI backend at `http://localhost:8000`. Please ensure the FastAPI server is running with `uvicorn app.main:app --reload`.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "m_welcome",
        sender: "ai",
        text: "👋 Chat reset. Ask any question about CPU scheduling, memory management, deadlock prevention, or virtual filesystems!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="intelliai-container">
      {/* Top Header */}
      <div className="ai-header-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="ai-logo-icon">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="ai-title">IntelliAI Assistant</div>
            <div className="ai-subtitle">OS Concept Tutor & Viva Defense Companion</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <span className="badge badge-simulated" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", borderColor: "rgba(168, 85, 247, 0.4)" }}>
            Offline Tutor Mode
          </span>
          <button className="reset-chat-btn" onClick={handleResetChat} title="Reset Chat">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="ai-suggestions-row">
        {SUGGESTIONS.map((s, idx) => {
          const Icon = s.icon;
          return (
            <button
              key={idx}
              className="suggestion-chip"
              onClick={() => handleSend(s.prompt)}
              disabled={loading}
            >
              <Icon size={12} className="chip-icon" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Messages Stream */}
      <div className="ai-messages-scroller">
        {messages.map((m) => {
          const isAi = m.sender === "ai";
          return (
            <div key={m.id} className={`ai-message-row ${isAi ? "from-ai" : "from-user"}`}>
              <div className="sender-avatar">
                {isAi ? <Bot size={15} /> : <User size={15} />}
              </div>

              <div className="message-bubble">
                <div className="message-content">
                  {m.text.split("\n\n").map((para, pIdx) => (
                    <p key={pIdx} style={{ margin: "4px 0" }}>
                      {para.split("\n").map((line, lIdx) => (
                        <React.Fragment key={lIdx}>
                          {line.startsWith("### ") ? (
                            <span className="ai-heading">{line.replace("### ", "")}</span>
                          ) : line.startsWith("- ") ? (
                            <span className="ai-bullet">• {line.replace("- ", "")}</span>
                          ) : (
                            line
                          )}
                          {lIdx < para.split("\n").length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  ))}
                </div>

                <div className="message-meta">
                  <span className="timestamp">{m.timestamp}</span>
                  {isAi && (
                    <button
                      className="copy-btn"
                      onClick={() => handleCopy(m.id, m.text)}
                      title="Copy response"
                    >
                      {copiedId === m.id ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="ai-message-row from-ai">
            <div className="sender-avatar">
              <Bot size={15} />
            </div>
            <div className="message-bubble typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Composer */}
      <form
        className="ai-composer-bar"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="text"
          placeholder="Ask an Operating Systems question (e.g. 'Explain SJF vs SRTF')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

