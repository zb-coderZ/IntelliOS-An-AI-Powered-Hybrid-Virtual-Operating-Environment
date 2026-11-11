import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserAccount {
  username: string;
  role: "admin" | "standard" | "restricted";
  display_name: string;
  is_active: number;
}

interface UserContextType {
  activeUser: UserAccount;
  allUsers: UserAccount[];
  switchUser: (username: string) => Promise<boolean>;
  loading: boolean;
}

const API = "http://localhost:8000/api";

const DEFAULT_USER: UserAccount = {
  username: "student",
  role: "standard",
  display_name: "Student User",
  is_active: 1,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeUser, setActiveUser] = useState<UserAccount>(() => {
    const saved = localStorage.getItem("intellios_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return DEFAULT_USER;
  });

  const [allUsers, setAllUsers] = useState<UserAccount[]>([
    { username: "root", role: "admin", display_name: "Administrator", is_active: 0 },
    { username: "student", role: "standard", display_name: "Student User", is_active: 1 },
    { username: "guest", role: "restricted", display_name: "Guest Observer", is_active: 0 },
  ]);
  const [loading, setLoading] = useState(false);

  // Sync users from backend SQLite
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/users`);
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setAllUsers(data.users);
        }
        if (data.active_user) {
          setActiveUser(data.active_user);
          localStorage.setItem("intellios_user", JSON.stringify(data.active_user));
        }
      }
    } catch {
      // Backend offline, keep local state
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const switchUser = async (username: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/users/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.active_user) {
          setActiveUser(data.active_user);
          localStorage.setItem("intellios_user", JSON.stringify(data.active_user));
        }
        fetchUsers();
        return true;
      }
      return false;
    } catch {
      // Fallback local switch
      const found = allUsers.find((u) => u.username === username);
      if (found) {
        setActiveUser(found);
        localStorage.setItem("intellios_user", JSON.stringify(found));
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ activeUser, allUsers, switchUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
};

