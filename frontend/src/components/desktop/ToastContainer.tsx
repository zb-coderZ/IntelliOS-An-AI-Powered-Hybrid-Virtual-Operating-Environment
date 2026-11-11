import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";

export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="toast-container" aria-live="polite">
      <AnimatePresence>
        {notifications.map((n) => {
          let Icon = Info;
          let iconColor = "var(--accent)";
          if (n.type === "success") {
            Icon = CheckCircle2;
            iconColor = "#10b981";
          } else if (n.type === "warning") {
            Icon = AlertTriangle;
            iconColor = "#f59e0b";
          } else if (n.type === "error") {
            Icon = XCircle;
            iconColor = "#ef4444";
          }

          return (
            <motion.div
              key={n.id}
              className={`toast-card toast-${n.type || "info"}`}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              layout
            >
              <div className="toast-icon">
                <Icon size={16} style={{ color: iconColor }} />
              </div>
              <div className="toast-body">
                <div className="toast-header-row">
                  <span className="toast-title">{n.title}</span>
                  <span className="toast-time">{n.timestamp}</span>
                </div>
                <div className="toast-message">{n.message}</div>
              </div>
              <button
                className="toast-close-btn"
                onClick={() => removeNotification(n.id)}
                aria-label="Dismiss notification"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
