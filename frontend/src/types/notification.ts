export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  timestamp: string;
  autoDismissMs?: number;
}

