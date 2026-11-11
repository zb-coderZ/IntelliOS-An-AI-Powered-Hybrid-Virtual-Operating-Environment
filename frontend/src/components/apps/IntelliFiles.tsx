import React, { useState, useEffect } from "react";
import {
  Folder,
  FileText,
  Home,
  Trash2,
  HardDrive,
  Download,
  FileCode,
  Search,
  Grid,
  List as ListIcon,
  Plus,
  RotateCcw,
  Edit2,
  Trash,
  X,
  ChevronRight,
  Eye,
  Server,
  FolderPlus,
  FilePlus,
  Check,
} from "lucide-react";

const API = "http://localhost:8000/api";

interface FileItem {
  id: string;
  name: string;
  parent_id?: string | null;
  is_folder: boolean;
  size: number;
  owner: string;
  permissions: string;
  modified_at: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
  path?: string;
}

export const IntelliFiles: React.FC = () => {
  // Mode: "virtual" or "ubuntu"
  const [mode, setMode] = useState<"virtual" | "ubuntu">("virtual");

  // Virtual VFS state
  const [currentFolderId, setCurrentFolderId] = useState<string>("home");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "root", name: "File System" },
    { id: "home", name: "Home" },
  ]);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Ubuntu WSL state
  const [ubuntuPath, setUbuntuPath] = useState("/home");
  const [ubuntuItems, setUbuntuItems] = useState<FileItem[]>([]);
  const [ubuntuError, setUbuntuError] = useState<string | null>(null);

  // File Viewer / Editor state
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string; content: string } | null>(null);
  const [fileEditContent, setFileEditContent] = useState("");
  const [savingFile, setSavingFile] = useState(false);

  // Modals
  const [newModalType, setNewModalType] = useState<"folder" | "file" | null>(null);
  const [newModalName, setNewModalName] = useState("");
  const [newModalContent, setNewModalContent] = useState("");
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<FileItem | null>(null);

  // Fetch Virtual Directory
  const fetchVirtualDir = async (folderId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/fs/list?parent_id=${encodeURIComponent(folderId)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // Disconnected
    } finally {
      setLoading(false);
    }
  };

  // Fetch Ubuntu Directory
  const fetchUbuntuDir = async (path: string) => {
    setLoading(true);
    setUbuntuError(null);
    try {
      const res = await fetch(`${API}/ubuntu/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          setUbuntuError(data.error);
          setUbuntuItems([]);
        } else {
          setUbuntuItems(data.items || []);
        }
      } else {
        setUbuntuError("Could not access directory.");
      }
    } catch {
      setUbuntuError("Ubuntu WSL is disconnected.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "virtual") {
      fetchVirtualDir(currentFolderId);
    } else {
      fetchUbuntuDir(ubuntuPath);
    }
  }, [mode, currentFolderId, ubuntuPath]);

  // Open Folder
  const handleOpenFolder = (item: FileItem) => {
    if (mode === "virtual") {
      setCurrentFolderId(item.id);
      setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
    } else {
      const nextPath = ubuntuPath.endsWith("/")
        ? `${ubuntuPath}${item.name}`
        : `${ubuntuPath}/${item.name}`;
      setUbuntuPath(nextPath);
    }
  };

  // Navigate via Breadcrumb
  const handleBreadcrumbClick = (idx: number) => {
    if (mode === "virtual") {
      const target = breadcrumbs[idx];
      setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
      setCurrentFolderId(target.id);
    } else {
      // For Ubuntu
      const parts = ubuntuPath.split("/").filter(Boolean);
      const newPath = "/" + parts.slice(0, idx).join("/");
      setUbuntuPath(newPath || "/home");
    }
  };

  // Open File Preview
  const handleOpenFile = async (item: FileItem) => {
    if (mode === "virtual") {
      try {
        const res = await fetch(`${API}/fs/read?id=${encodeURIComponent(item.id)}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedFile({ id: data.id, name: data.name, content: data.content || "" });
          setFileEditContent(data.content || "");
        }
      } catch {
        // Error
      }
    } else {
      // Ubuntu preview via /api/ubuntu/run (cat)
      try {
        const fullPath = ubuntuPath.endsWith("/")
          ? `${ubuntuPath}${item.name}`
          : `${ubuntuPath}/${item.name}`;
        const res = await fetch(`${API}/ubuntu/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: `cat "${fullPath}"` }),
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedFile({ id: item.id, name: item.name, content: data.stdout || data.stderr });
          setFileEditContent(data.stdout || data.stderr);
        }
      } catch {
        // Error
      }
    }
  };

  // Save File Content (Virtual)
  const handleSaveFile = async () => {
    if (!selectedFile || mode !== "virtual") return;
    setSavingFile(true);
    try {
      const res = await fetch(`${API}/fs/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedFile.id, content: fileEditContent }),
      });
      if (res.ok) {
        setSelectedFile(null);
        fetchVirtualDir(currentFolderId);
      }
    } catch {
      // Error
    } finally {
      setSavingFile(false);
    }
  };

  // Create Folder / File (Virtual)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModalName.trim()) return;

    try {
      const res = await fetch(`${API}/fs/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newModalName.trim(),
          parent_id: currentFolderId,
          is_folder: newModalType === "folder",
          content: newModalType === "file" ? newModalContent : "",
        }),
      });

      if (res.ok) {
        setNewModalType(null);
        setNewModalName("");
        setNewModalContent("");
        fetchVirtualDir(currentFolderId);
      }
    } catch {
      // Error
    }
  };

  // Rename Node (Virtual)
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameName.trim()) return;

    try {
      const res = await fetch(`${API}/fs/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: renameTarget.id, new_name: renameName.trim() }),
      });

      if (res.ok) {
        setRenameTarget(null);
        setRenameName("");
        fetchVirtualDir(currentFolderId);
      }
    } catch {
      // Error
    }
  };

  // Delete Node (Virtual)
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      const res = await fetch(`${API}/fs/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteConfirm.id }),
      });

      if (res.ok) {
        setDeleteConfirm(null);
        fetchVirtualDir(currentFolderId);
      }
    } catch {
      // Error
    }
  };

  // Switch Quick Location
  const handleQuickLocation = (loc: string) => {
    if (loc === "ubuntu") {
      setMode("ubuntu");
      setUbuntuPath("/home");
      return;
    }

    setMode("virtual");
    if (loc === "home") {
      setCurrentFolderId("home");
      setBreadcrumbs([
        { id: "root", name: "File System" },
        { id: "home", name: "Home" },
      ]);
    } else if (loc === "root") {
      setCurrentFolderId("root");
      setBreadcrumbs([{ id: "root", name: "File System" }]);
    } else if (loc === "Trash") {
      setCurrentFolderId("Trash");
      setBreadcrumbs([
        { id: "root", name: "File System" },
        { id: "Trash", name: "Trash" },
      ]);
    }
  };

  const activeItems = mode === "virtual" ? items : ubuntuItems;
  const filteredItems = activeItems.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="intellifiles-container">
      {/* Sidebar - GNOME Nautilus style */}
      <div className="files-sidebar">
        <div className="sidebar-group-title">PLACES</div>
        <button
          className={`sidebar-nav-btn ${mode === "virtual" && currentFolderId === "home" ? "active" : ""}`}
          onClick={() => handleQuickLocation("home")}
        >
          <Home size={15} />
          <span>Home</span>
        </button>

        <button
          className={`sidebar-nav-btn ${mode === "virtual" && currentFolderId === "root" ? "active" : ""}`}
          onClick={() => handleQuickLocation("root")}
        >
          <HardDrive size={15} />
          <span>File System (/)</span>
        </button>

        <button
          className={`sidebar-nav-btn ${mode === "virtual" && currentFolderId === "Trash" ? "active" : ""}`}
          onClick={() => handleQuickLocation("Trash")}
        >
          <Trash2 size={15} />
          <span>Trash</span>
        </button>

        <div className="sidebar-separator" />
        <div className="sidebar-group-title">REAL SYSTEM</div>

        <button
          className={`sidebar-nav-btn ${mode === "ubuntu" ? "active" : ""}`}
          onClick={() => handleQuickLocation("ubuntu")}
        >
          <Server size={15} style={{ color: "#E95420" }} />
          <span>Real Ubuntu (WSL)</span>
        </button>
      </div>

      {/* Main Files Area */}
      <div className="files-main">
        {/* Top Navbar */}
        <div className="files-navbar">
          {/* Breadcrumbs */}
          <div className="files-breadcrumbs">
            {mode === "virtual" ? (
              breadcrumbs.map((b, idx) => (
                <React.Fragment key={b.id}>
                  {idx > 0 && <ChevronRight size={13} className="bc-sep" />}
                  <button
                    className={`bc-btn ${idx === breadcrumbs.length - 1 ? "active" : ""}`}
                    onClick={() => handleBreadcrumbClick(idx)}
                  >
                    {idx === 0 ? <HardDrive size={12} /> : null}
                    <span>{b.name}</span>
                  </button>
                </React.Fragment>
              ))
            ) : (
              <div className="ubuntu-path-display">
                <Server size={13} style={{ color: "#E95420" }} />
                <span>{ubuntuPath}</span>
              </div>
            )}
          </div>

          {/* Right Toolbar Controls */}
          <div className="files-toolbar-actions">
            {/* Search Box */}
            <div className="files-search-wrap">
              <Search size={13} className="search-icon" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-btn" onClick={() => setSearchQuery("")}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="view-toggle-group">
              <button
                className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <Grid size={14} />
              </button>
              <button
                className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <ListIcon size={14} />
              </button>
            </div>

            {/* Actions (Virtual Only) */}
            {mode === "virtual" && (
              <>
                <button
                  className="files-action-btn"
                  onClick={() => setNewModalType("folder")}
                  title="New Folder"
                >
                  <FolderPlus size={14} />
                  <span>New Folder</span>
                </button>

                <button
                  className="files-action-btn primary"
                  onClick={() => setNewModalType("file")}
                  title="New Text File"
                >
                  <FilePlus size={14} />
                  <span>New File</span>
                </button>
              </>
            )}

            <button
              className="files-action-btn icon-only"
              onClick={() =>
                mode === "virtual" ? fetchVirtualDir(currentFolderId) : fetchUbuntuDir(ubuntuPath)
              }
              title="Refresh"
            >
              <RotateCcw size={13} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {/* Provenance Header Strip */}
        <div className="files-provenance-bar">
          <span className={`badge ${mode === "virtual" ? "badge-simulated" : "badge-real-ubuntu"}`}>
            {mode === "virtual"
              ? "Source: Virtual OS File System (Inodes & Tree)"
              : "Source: Real Ubuntu via WSL2"}
          </span>
          <span className="items-count-text">
            {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Content Body */}
        <div className="files-view-container">
          {ubuntuError ? (
            <div className="files-error-state">
              <Server size={32} style={{ color: "#ef4444" }} />
              <h4>Directory Inaccessible</h4>
              <p>{ubuntuError}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="files-empty-state">
              <Folder size={38} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
              <p>This folder is empty</p>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="files-grid-view">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="file-card"
                  onDoubleClick={() => (item.is_folder ? handleOpenFolder(item) : handleOpenFile(item))}
                >
                  <div className="file-icon-wrap">
                    {item.is_folder ? (
                      <Folder size={44} className="folder-icon" />
                    ) : item.name.endsWith(".c") || item.name.endsWith(".py") || item.name.endsWith(".md") ? (
                      <FileCode size={40} className="code-icon" />
                    ) : (
                      <FileText size={40} className="doc-icon" />
                    )}
                  </div>
                  <span className="file-name" title={item.name}>
                    {item.name}
                  </span>
                  <span className="file-subtext">
                    {item.is_folder ? "Folder" : `${item.size} B`}
                  </span>

                  {/* Quick Card Action Buttons (Virtual) */}
                  {mode === "virtual" && item.id !== "root" && item.id !== "home" && item.id !== "Trash" && (
                    <div className="card-actions">
                      <button
                        title="Rename"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameTarget(item);
                          setRenameName(item.name);
                        }}
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        title="Delete"
                        className="del"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(item);
                        }}
                      >
                        <Trash size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="files-list-view">
              <table className="files-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th style={{ width: 110 }}>Permissions</th>
                    <th style={{ width: 90 }}>Owner</th>
                    <th style={{ width: 90 }}>Size</th>
                    <th style={{ width: 140 }}>Modified</th>
                    {mode === "virtual" && <th style={{ width: 80, textAlign: "right" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="file-row"
                      onDoubleClick={() =>
                        item.is_folder ? handleOpenFolder(item) : handleOpenFile(item)
                      }
                    >
                      <td>
                        <div className="row-name-cell">
                          {item.is_folder ? (
                            <Folder size={16} className="folder-icon" />
                          ) : (
                            <FileText size={16} className="doc-icon" />
                          )}
                          <span className="name-text">{item.name}</span>
                        </div>
                      </td>
                      <td className="mono-cell">{item.permissions}</td>
                      <td className="mono-cell">{item.owner}</td>
                      <td className="mono-cell">{item.is_folder ? "—" : `${item.size} B`}</td>
                      <td className="mono-cell">{item.modified_at}</td>
                      {mode === "virtual" && (
                        <td style={{ textAlign: "right" }}>
                          {item.id !== "root" && item.id !== "home" && item.id !== "Trash" ? (
                            <div className="row-actions">
                              <button
                                title="Rename"
                                onClick={() => {
                                  setRenameTarget(item);
                                  setRenameName(item.name);
                                }}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                title="Delete"
                                className="del"
                                onClick={() => setDeleteConfirm(item)}
                              >
                                <Trash size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className="locked-pill">System</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TEXT FILE VIEWER / EDITOR MODAL                           */}
      {/* ========================================================= */}
      {selectedFile && (
        <div className="files-modal-backdrop" onClick={() => setSelectedFile(null)}>
          <div className="files-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="editor-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={16} style={{ color: "var(--accent)" }} />
                <span className="editor-modal-title">{selectedFile.name}</span>
                {mode === "ubuntu" && <span className="read-only-pill">Read Only (WSL)</span>}
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedFile(null)}>
                <X size={15} />
              </button>
            </div>

            <div className="editor-modal-body">
              <textarea
                value={fileEditContent}
                readOnly={mode === "ubuntu"}
                onChange={(e) => setFileEditContent(e.target.value)}
                className="editor-textarea"
                placeholder="File is empty."
              />
            </div>

            <div className="editor-modal-footer">
              <span className="footer-chars-count">
                {fileEditContent.length} characters ({fileEditContent.split("\n").length} lines)
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setSelectedFile(null)}>Close</button>
                {mode === "virtual" && (
                  <button className="primary" onClick={handleSaveFile} disabled={savingFile}>
                    <Check size={13} /> {savingFile ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CREATE NEW FOLDER / FILE MODAL                            */}
      {/* ========================================================= */}
      {newModalType && (
        <div className="files-modal-backdrop" onClick={() => setNewModalType(null)}>
          <form
            className="files-dialog-box"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateSubmit}
          >
            <div className="dialog-header">
              <span className="dialog-title">
                {newModalType === "folder" ? "Create New Folder" : "Create New File"}
              </span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setNewModalType(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="dialog-body">
              <label>Name</label>
              <input
                type="text"
                required
                autoFocus
                placeholder={newModalType === "folder" ? "Folder name..." : "file.txt, script.py..."}
                value={newModalName}
                onChange={(e) => setNewModalName(e.target.value)}
              />

              {newModalType === "file" && (
                <>
                  <label style={{ marginTop: 10 }}>Initial Content (optional)</label>
                  <textarea
                    rows={4}
                    placeholder="Type content here..."
                    value={newModalContent}
                    onChange={(e) => setNewModalContent(e.target.value)}
                  />
                </>
              )}
            </div>

            <div className="dialog-footer">
              <button type="button" onClick={() => setNewModalType(null)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* RENAME MODAL                                              */}
      {/* ========================================================= */}
      {renameTarget && (
        <div className="files-modal-backdrop" onClick={() => setRenameTarget(null)}>
          <form
            className="files-dialog-box"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleRenameSubmit}
          >
            <div className="dialog-header">
              <span className="dialog-title">Rename "{renameTarget.name}"</span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRenameTarget(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="dialog-body">
              <label>New Name</label>
              <input
                type="text"
                required
                autoFocus
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
              />
            </div>

            <div className="dialog-footer">
              <button type="button" onClick={() => setRenameTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Rename
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRM MODAL                                      */}
      {/* ========================================================= */}
      {deleteConfirm && (
        <div className="files-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="files-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <span className="dialog-title">Delete Item?</span>
              <button className="modal-close-btn" onClick={() => setDeleteConfirm(null)}>
                <X size={15} />
              </button>
            </div>

            <div className="dialog-body">
              <p>
                Are you sure you want to delete <b>{deleteConfirm.name}</b>
                {deleteConfirm.is_folder ? " and all its contents" : ""}?
              </p>
            </div>

            <div className="dialog-footer">
              <button onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="danger-btn" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
