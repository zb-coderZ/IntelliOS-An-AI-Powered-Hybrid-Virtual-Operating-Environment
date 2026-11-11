import datetime
import os
from typing import Dict, List, Optional, Any

class FSNode:
    def __init__(
        self,
        node_id: str,
        name: str,
        parent_id: Optional[str] = None,
        is_folder: bool = False,
        content: str = "",
        owner: str = "student",
        permissions: str = "rw-r--r--",
    ):
        self.id = node_id
        self.name = name
        self.parent_id = parent_id
        self.is_folder = is_folder
        self.content = content
        self.size = len(content.encode("utf-8")) if not is_folder else 4096
        self.owner = owner
        self.permissions = permissions if not is_folder else "rwxr-xr-x"
        self.modified_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "parent_id": self.parent_id,
            "is_folder": self.is_folder,
            "size": self.size,
            "owner": self.owner,
            "permissions": self.permissions,
            "modified_at": self.modified_at,
        }

class VirtualFileSystem:
    def __init__(self):
        self.nodes: Dict[str, FSNode] = {}
        self._next_id = 1
        self._init_default_structure()

    def _generate_id(self) -> str:
        nid = str(self._next_id)
        self._next_id += 1
        return nid

    def _init_default_structure(self):
        self.nodes.clear()
        self._next_id = 1

        # Root
        root = FSNode("root", "/", parent_id=None, is_folder=True)
        self.nodes["root"] = root

        # Standard OS directories
        home = self.create("home", parent_id="root", is_folder=True, permissions="rwxr-xr-x")
        docs = self.create("Documents", parent_id=home.id, is_folder=True)
        downloads = self.create("Downloads", parent_id=home.id, is_folder=True)
        trash = self.create("Trash", parent_id="root", is_folder=True)

        # Sample OS Course files
        self.create(
            "os_syllabus.txt",
            parent_id=docs.id,
            is_folder=False,
            content="Operating Systems Course Topics:\n1. Process Management & PCB\n2. CPU Scheduling (FCFS, SJF, RR)\n3. Deadlocks & Banker's Algorithm\n4. Memory Allocation (First Fit, Best Fit)\n5. Virtual File Systems & Inodes",
        )
        self.create(
            "bankers_notes.md",
            parent_id=docs.id,
            is_folder=False,
            content="# Banker's Algorithm Summary\n- Avoids deadlock by safe state checking\n- Need Matrix = Max - Allocation\n- Work = Available resources",
        )
        self.create(
            "kernel_patch.c",
            parent_id=downloads.id,
            is_folder=False,
            content='#include <linux/kernel.h>\n#include <linux/init.h>\n\nstatic int __init hello_init(void) {\n    printk(KERN_INFO "IntelliOS Kernel Module Loaded\\n");\n    return 0;\n}\n',
        )

    def list_dir(self, parent_id: str) -> List[Dict[str, Any]]:
        items = [
            node.to_dict()
            for node in self.nodes.values()
            if node.parent_id == parent_id
        ]
        # Sort folders first, then files alphabetically
        items.sort(key=lambda x: (not x["is_folder"], x["name"].lower()))
        return items

    def get_node(self, node_id: str) -> Optional[FSNode]:
        return self.nodes.get(node_id)

    def create(
        self,
        name: str,
        parent_id: str,
        is_folder: bool = False,
        content: str = "",
        owner: str = "student",
        permissions: str = "rw-r--r--",
    ) -> FSNode:
        # Check duplicate in same directory
        for node in self.nodes.values():
            if node.parent_id == parent_id and node.name == name:
                raise ValueError(f"An item named '{name}' already exists in this directory.")

        nid = f"n_{self._generate_id()}" if parent_id != "root" or name != "home" else name
        new_node = FSNode(
            node_id=nid,
            name=name,
            parent_id=parent_id,
            is_folder=is_folder,
            content=content,
            owner=owner,
            permissions=permissions,
        )
        self.nodes[nid] = new_node
        return new_node

    def rename(self, node_id: str, new_name: str) -> FSNode:
        if node_id not in self.nodes or node_id == "root":
            raise ValueError("Cannot rename root or non-existent node.")
        
        node = self.nodes[node_id]
        new_name = new_name.strip()
        if not new_name:
            raise ValueError("Name cannot be empty.")

        # Check duplicate
        for other in self.nodes.values():
            if other.parent_id == node.parent_id and other.id != node_id and other.name == new_name:
                raise ValueError(f"An item named '{new_name}' already exists in this folder.")

        node.name = new_name
        node.modified_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        return node

    def delete(self, node_id: str) -> bool:
        if node_id not in self.nodes or node_id in ("root", "home", "Trash"):
            raise ValueError("Cannot delete system protected directory.")

        # Recursive deletion of descendants
        to_delete = [node_id]
        i = 0
        while i < len(to_delete):
            curr = to_delete[i]
            for child in self.nodes.values():
                if child.parent_id == curr:
                    to_delete.append(child.id)
            i += 1

        for d in to_delete:
            if d in self.nodes:
                del self.nodes[d]

        return True

    def read_file(self, node_id: str) -> Dict[str, Any]:
        node = self.nodes.get(node_id)
        if not node:
            raise ValueError("File does not exist.")
        if node.is_folder:
            raise ValueError("Cannot read content of a directory.")
        return {
            "id": node.id,
            "name": node.name,
            "content": node.content,
            "size": node.size,
            "modified_at": node.modified_at,
        }

    def write_file(self, node_id: str, content: str) -> FSNode:
        node = self.nodes.get(node_id)
        if not node:
            raise ValueError("File does not exist.")
        if node.is_folder:
            raise ValueError("Cannot write content to a directory.")
        node.content = content
        node.size = len(content.encode("utf-8"))
        node.modified_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        return node

    def reset(self):
        self._init_default_structure()
        return self.list_dir("root")

# Global singleton
virtual_fs = VirtualFileSystem()
