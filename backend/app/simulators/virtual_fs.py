import datetime
from typing import Dict, List, Optional, Any
from ..database import get_db_connection, seed_default_fs

class VirtualFileSystem:
    """
    SQLite-backed Virtual File System simulator with Inodes,
    directory hierarchy, and Role-Based Access Control (RBAC).
    """

    def _get_active_user(self, conn) -> Dict[str, Any]:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE is_active = 1 LIMIT 1")
        row = cursor.fetchone()
        if row:
            return dict(row)
        return {"username": "student", "role": "standard", "display_name": "Student User"}

    def get_active_user(self) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            return self._get_active_user(conn)
        finally:
            conn.close()

    def set_active_user(self, username: str) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            if not user:
                raise ValueError(f"User '{username}' does not exist.")
            
            cursor.execute("UPDATE users SET is_active = 0")
            cursor.execute("UPDATE users SET is_active = 1 WHERE username = ?", (username,))
            conn.commit()
            return dict(user)
        finally:
            conn.close()

    def list_users(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM users ORDER BY rowid ASC")
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def list_dir(self, parent_id: str) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM nodes WHERE parent_id = ?", (parent_id,))
            rows = cursor.fetchall()
            items = []
            for r in rows:
                d = dict(r)
                d["is_folder"] = bool(d["is_folder"])
                items.append(d)
            # Sort folders first, then alphabetical
            items.sort(key=lambda x: (not x["is_folder"], x["name"].lower()))
            return items
        finally:
            conn.close()

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM nodes WHERE id = ?", (node_id,))
            row = cursor.fetchone()
            if not row:
                return None
            d = dict(row)
            d["is_folder"] = bool(d["is_folder"])
            return d
        finally:
            conn.close()

    def create(
        self,
        name: str,
        parent_id: str,
        is_folder: bool = False,
        content: str = "",
        owner: Optional[str] = None,
        permissions: Optional[str] = None,
        active_role: Optional[str] = None,
    ) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            user = self._get_active_user(conn)
            role = active_role or user["role"]
            actual_owner = owner or user["username"]

            # Role-Based Permission Check: guest / restricted cannot write or create
            if role == "restricted":
                raise PermissionError("Permission Denied (403): 'guest' has read-only access. Switch to 'student' or 'root' in Settings to create items.")

            # Validate name
            clean_name = name.strip()
            if not clean_name:
                raise ValueError("Item name cannot be empty.")

            # Check duplicate in same directory
            cursor.execute("SELECT id FROM nodes WHERE parent_id = ? AND name = ?", (parent_id, clean_name))
            if cursor.fetchone():
                raise ValueError(f"An item named '{clean_name}' already exists in this directory.")

            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            node_id = f"n_{int(datetime.datetime.now().timestamp() * 1000)}"
            actual_perms = permissions or ("rwxr-xr-x" if is_folder else "rw-r--r--")
            size = len(content.encode("utf-8")) if not is_folder else 4096

            cursor.execute("""
            INSERT INTO nodes (id, name, parent_id, is_folder, content, size, owner, permissions, modified_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                node_id,
                clean_name,
                parent_id,
                1 if is_folder else 0,
                content if not is_folder else "",
                size,
                actual_owner,
                actual_perms,
                now,
            ))
            conn.commit()

            return {
                "id": node_id,
                "name": clean_name,
                "parent_id": parent_id,
                "is_folder": is_folder,
                "size": size,
                "owner": actual_owner,
                "permissions": actual_perms,
                "modified_at": now,
            }
        finally:
            conn.close()

    def rename(self, node_id: str, new_name: str, active_role: Optional[str] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            user = self._get_active_user(conn)
            role = active_role or user["role"]

            if role == "restricted":
                raise PermissionError("Permission Denied (403): 'guest' is restricted to read-only actions.")

            if node_id in ("root", "home", "Trash"):
                raise ValueError("Cannot rename system protected root directories.")

            cursor.execute("SELECT * FROM nodes WHERE id = ?", (node_id,))
            target = cursor.fetchone()
            if not target:
                raise ValueError("Node does not exist.")

            # Check ownership (unless admin/root)
            if role != "admin" and target["owner"] != user["username"]:
                raise PermissionError("Permission Denied (403): Cannot modify items owned by another user.")

            clean_name = new_name.strip()
            if not clean_name:
                raise ValueError("Name cannot be empty.")

            # Check duplicate in same directory
            cursor.execute("SELECT id FROM nodes WHERE parent_id = ? AND name = ? AND id != ?", (target["parent_id"], clean_name, node_id))
            if cursor.fetchone():
                raise ValueError(f"An item named '{clean_name}' already exists in this folder.")

            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            cursor.execute("UPDATE nodes SET name = ?, modified_at = ? WHERE id = ?", (clean_name, now, node_id))
            conn.commit()

            cursor.execute("SELECT * FROM nodes WHERE id = ?", (node_id,))
            row = cursor.fetchone()
            d = dict(row)
            d["is_folder"] = bool(d["is_folder"])
            return d
        finally:
            conn.close()

    def delete(self, node_id: str, active_role: Optional[str] = None) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            user = self._get_active_user(conn)
            role = active_role or user["role"]

            if role == "restricted":
                raise PermissionError("Permission Denied (403): 'guest' is restricted to read-only actions.")

            if node_id in ("root", "home", "Trash"):
                raise ValueError("Cannot delete system protected directory.")

            cursor.execute("SELECT * FROM nodes WHERE id = ?", (node_id,))
            target = cursor.fetchone()
            if not target:
                raise ValueError("Item does not exist.")

            if role != "admin" and target["owner"] != user["username"]:
                raise PermissionError("Permission Denied (403): Cannot delete items owned by another user.")

            # Recursive delete of descendants
            to_delete = [node_id]
            i = 0
            while i < len(to_delete):
                curr = to_delete[i]
                cursor.execute("SELECT id FROM nodes WHERE parent_id = ?", (curr,))
                for child in cursor.fetchall():
                    to_delete.append(child["id"])
                i += 1

            for d in to_delete:
                cursor.execute("DELETE FROM nodes WHERE id = ?", (d,))

            conn.commit()
            return True
        finally:
            conn.close()

    def read_file(self, node_id: str) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM nodes WHERE id = ?", (node_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("File does not exist.")
            if row["is_folder"]:
                raise ValueError("Cannot read content of a directory.")
            return {
                "id": row["id"],
                "name": row["name"],
                "content": row["content"] or "",
                "size": row["size"],
                "modified_at": row["modified_at"],
            }
        finally:
            conn.close()

    def write_file(self, node_id: str, content: str, active_role: Optional[str] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            user = self._get_active_user(conn)
            role = active_role or user["role"]

            if role == "restricted":
                raise PermissionError("Permission Denied (403): 'guest' has read-only access.")

            cursor.execute("SELECT * FROM nodes WHERE id = ?", (node_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("File does not exist.")
            if row["is_folder"]:
                raise ValueError("Cannot write content to a directory.")

            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            size = len(content.encode("utf-8"))
            cursor.execute("UPDATE nodes SET content = ?, size = ?, modified_at = ? WHERE id = ?", (content, size, now, node_id))
            conn.commit()

            cursor.execute("SELECT * FROM nodes WHERE id = ?", (node_id,))
            updated = dict(cursor.fetchone())
            updated["is_folder"] = False
            return updated
        finally:
            conn.close()

    def reset(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            seed_default_fs(conn)
            return self.list_dir("root")
        finally:
            conn.close()

# Global singleton
virtual_fs = VirtualFileSystem()
