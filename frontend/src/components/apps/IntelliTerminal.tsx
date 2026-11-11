import React, { useState, useEffect, useRef } from "react";
import { Plus, X, Terminal as TerminalIcon, RotateCcw } from "lucide-react";

const API = "http://localhost:8000/api";

interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  history: Array<{ command: string; output: string; isError?: boolean; cwd: string }>;
  cmdHistory: string[];
}

export const IntelliTerminal: React.FC = () => {
  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: "term-1",
      name: "bash 1",
      cwd: "~",
      history: [
        {
          command: "uname -a",
          output: "Linux ubuntu-24.04 5.15.167.4-microsoft-standard-WSL2 #1 SMP x86_64 GNU/Linux",
          cwd: "~",
        },
      ],
      cmdHistory: ["uname -a"],
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>("term-1");
  const [inputVal, setInputVal] = useState("");
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.history, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSessionId]);

  const updateActiveSession = (updater: (s: TerminalSession) => TerminalSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? updater(s) : s))
    );
  };

  const handleAddSession = () => {
    const newId = `term-${Date.now()}`;
    const newSession: TerminalSession = {
      id: newId,
      name: `bash ${sessions.length + 1}`,
      cwd: "~",
      history: [
        {
          command: "whoami && uname -m",
          output: "ubuntu\nx86_64",
          cwd: "~",
        },
      ],
      cmdHistory: ["whoami && uname -m"],
    };
    setSessions([...sessions, newSession]);
    setActiveSessionId(newId);
  };

  const handleCloseSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) return; // Keep at least one tab
    const nextSessions = sessions.filter((s) => s.id !== id);
    setSessions(nextSessions);
    if (activeSessionId === id) {
      setActiveSessionId(nextSessions[0].id);
    }
  };

  const executeCommand = async () => {
    const cmd = inputVal.trim();
    if (!cmd) return;

    if (cmd === "clear") {
      updateActiveSession((s) => ({
        ...s,
        history: [],
        cmdHistory: [...s.cmdHistory, cmd],
      }));
      setInputVal("");
      setHistoryIndex(null);
      return;
    }

    setLoading(true);
    setInputVal("");
    setHistoryIndex(null);

    try {
      const res = await fetch(`${API}/ubuntu/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, cwd: activeSession.cwd }),
      });

      const data = await res.json();

      let output = "";
      let isError = false;

      if (!res.ok) {
        output = data.detail || "Command failed or not allowed.";
        isError = true;
      } else {
        output = (data.stdout || "") + (data.stderr || "");
      }

      const nextCwd = data.cwd || activeSession.cwd;

      updateActiveSession((s) => ({
        ...s,
        cwd: nextCwd,
        history: [
          ...s.history,
          { command: cmd, output: output || "(no output)", isError, cwd: s.cwd },
        ],
        cmdHistory: [...s.cmdHistory, cmd],
      }));
    } catch {
      updateActiveSession((s) => ({
        ...s,
        history: [
          ...s.history,
          {
            command: cmd,
            output: "Backend or WSL Ubuntu unreachable. Ensure Uvicorn is running.",
            isError: true,
            cwd: s.cwd,
          },
        ],
        cmdHistory: [...s.cmdHistory, cmd],
      }));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const list = activeSession.cmdHistory;
      if (list.length === 0) return;
      const nextIdx =
        historyIndex === null
          ? list.length - 1
          : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInputVal(list[nextIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const list = activeSession.cmdHistory;
      if (historyIndex === null) return;
      if (historyIndex < list.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputVal(list[nextIdx]);
      } else {
        setHistoryIndex(null);
        setInputVal("");
      }
    }
  };

  return (
    <div className="terminal-container" onClick={() => inputRef.current?.focus()}>
      {/* Terminal Tabs Header */}
      <div className="terminal-tabs-header">
        <div className="terminal-tabs-list">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`terminal-tab ${s.id === activeSessionId ? "active" : ""}`}
              onClick={() => setActiveSessionId(s.id)}
            >
              <TerminalIcon size={12} className="tab-icon" />
              <span className="tab-name">{s.name}</span>
              {sessions.length > 1 && (
                <button
                  type="button"
                  className="tab-close-btn"
                  onClick={(e) => handleCloseSession(s.id, e)}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="terminal-new-tab-btn"
            title="New Terminal Session"
            onClick={handleAddSession}
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="terminal-provenance-tag">
          <span className="badge badge-real-ubuntu">Real Ubuntu 24.04 (WSL2)</span>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="terminal-scroll-area">
        <div className="terminal-welcome-banner">
          Welcome to Ubuntu 24.04 LTS (GNU/Linux x86_64) via WSL2.
          Type commands like <span className="term-hl">ls</span>, <span className="term-hl">cd</span>, <span className="term-hl">pwd</span>, <span className="term-hl">free -m</span>, <span className="term-hl">ps aux</span>, <span className="term-hl">cat</span>, <span className="term-hl">mkdir</span>, <span className="term-hl">uname -a</span>.
        </div>

        {/* History stream */}
        {activeSession.history.map((h, i) => (
          <div key={i} className="terminal-entry">
            <div className="terminal-prompt-line">
              <span className="term-user">user@ubuntu</span>
              <span className="term-sep">:</span>
              <span className="term-path">{h.cwd}</span>
              <span className="term-dollar">$</span>
              <span className="term-cmd-text">{h.command}</span>
            </div>
            <pre
              className={`terminal-output ${h.isError ? "term-error" : ""}`}
            >
              {h.output}
            </pre>
          </div>
        ))}

        {/* Active command input line */}
        <div className="terminal-prompt-line active-line">
          <span className="term-user">user@ubuntu</span>
          <span className="term-sep">:</span>
          <span className="term-path">{activeSession.cwd}</span>
          <span className="term-dollar">$</span>
          <div className="terminal-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="terminal-real-input"
              autoFocus
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
            />
            {loading && <span className="term-spinner">running...</span>}
          </div>
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

