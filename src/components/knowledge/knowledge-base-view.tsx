"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Search,
  FileText,
  Brain,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

type DocumentDTO = {
  id: string;
  title: string;
  content: string;
  hasEmbedding: boolean;
  createdAt: string;
  updatedAt: string;
};
type DocumentSearchResult = DocumentDTO & { similarity: number };

type MemoryDTO = { id: string; content: string; createdAt: string };
type MemorySearchResult = MemoryDTO & { similarity: number };

const TABS = ["documents", "memories"] as const;
type Tab = (typeof TABS)[number];

export function KnowledgeBaseView({
  initialDocuments,
  initialMemories,
}: {
  initialDocuments: DocumentDTO[];
  initialMemories: MemoryDTO[];
}) {
  const [tab, setTab] = useState<Tab>("documents");
  const [documents, setDocuments] = useState(initialDocuments);
  const [memories, setMemories] = useState(initialMemories);

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 border-b border-[var(--border)] pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t === "documents" ? (
              <FileText className="size-3.5" />
            ) : (
              <Brain className="size-3.5" />
            )}
            {t === "documents" ? "Documents" : "Memories"}
          </button>
        ))}
      </div>

      {tab === "documents" ? (
        <DocumentsTab documents={documents} setDocuments={setDocuments} />
      ) : (
        <MemoriesTab memories={memories} setMemories={setMemories} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documents tab
// ---------------------------------------------------------------------------

function DocumentsTab({
  documents,
  setDocuments,
}: {
  documents: DocumentDTO[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentDTO[]>>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocumentSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  function createDoc() {
    if (!title.trim() || !content.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/knowledge/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
          }),
        });
        const data = (await res.json()) as {
          document?: DocumentDTO;
          embeddingError?: string | null;
          error?: string;
        };
        if (!res.ok || !data.document) {
          throw new Error(data.error ?? "Failed to create document.");
        }
        setDocuments((prev) => [data.document as DocumentDTO, ...prev]);
        if (data.embeddingError) {
          setError(`Saved, but embedding failed: ${data.embeddingError}`);
        }
        setTitle("");
        setContent("");
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/knowledge/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) setDocuments((prev) => prev.filter((d) => d.id !== id));
    });
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch("/api/knowledge/documents/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = (await res.json()) as {
        results?: DocumentSearchResult[];
        error?: string;
      };
      if (!res.ok || !data.results) {
        throw new Error(data.error ?? "Search failed.");
      }
      setResults(data.results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  const list = results ?? documents;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setResults(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search by meaning, not just keywords…"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] py-1.5 pr-3 pl-8 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={search}
          disabled={searching}
        >
          {searching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
        </Button>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" />
          New
        </Button>
      </div>

      {searchError && (
        <p className="text-xs text-[var(--destructive)]">{searchError}</p>
      )}
      {results && (
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>
            {results.length} semantic match{results.length !== 1 ? "es" : ""}
          </span>
          <button
            type="button"
            onClick={() => {
              setResults(null);
              setQuery("");
            }}
            className="text-[var(--primary)] hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Document content…"
              rows={6}
              className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            <Button
              size="sm"
              disabled={isPending || !title.trim() || !content.trim()}
              onClick={createDoc}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save document
            </Button>
            {error && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--destructive)]">
                <AlertTriangle className="size-3.5" />
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {list.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">
          {results ? "No matching documents." : "No documents yet."}
        </p>
      )}

      <div className="space-y-2">
        {list.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="flex items-start justify-between gap-4 pt-4 pb-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {doc.title}
                  </p>
                  {!doc.hasEmbedding && (
                    <Badge variant="muted">not searchable yet</Badge>
                  )}
                  {"similarity" in doc && (
                    <Badge variant="default">
                      {Math.round(
                        (doc as DocumentSearchResult).similarity * 100,
                      )}
                      % match
                    </Badge>
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-[var(--muted-foreground)]">
                  {doc.content}
                </p>
                <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                  {formatDateTime(doc.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(doc.id)}
                disabled={isPending}
              >
                <Trash2 className="size-4 text-[var(--muted-foreground)]" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Memories tab
// ---------------------------------------------------------------------------

function MemoriesTab({
  memories,
  setMemories,
}: {
  memories: MemoryDTO[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryDTO[]>>;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemorySearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  function addMemory() {
    if (!content.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/knowledge/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        });
        const data = (await res.json()) as {
          memory?: MemoryDTO;
          error?: string;
        };
        if (!res.ok || !data.memory) {
          throw new Error(data.error ?? "Failed to save memory.");
        }
        setMemories((prev) => [data.memory as MemoryDTO, ...prev]);
        setContent("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/knowledge/memories/${id}`, {
        method: "DELETE",
      });
      if (res.ok) setMemories((prev) => prev.filter((m) => m.id !== id));
    });
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/knowledge/memories/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = (await res.json()) as { results?: MemorySearchResult[] };
      setResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  const list = results ?? memories;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Something for JARVIS to remember…"
            rows={2}
            className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <Button
            size="sm"
            disabled={isPending || !content.trim()}
            onClick={addMemory}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Remember this
          </Button>
          {error && (
            <p className="text-xs text-[var(--destructive)]">{error}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setResults(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Recall a memory by meaning…"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] py-1.5 pr-3 pl-8 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={search}
          disabled={searching}
        >
          {searching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">
          {results ? "No matching memories." : "Nothing remembered yet."}
        </p>
      )}

      <div className="space-y-2">
        {list.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-start justify-between gap-4 pt-4 pb-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--foreground)]">{m.content}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {formatDateTime(m.createdAt)}
                  </p>
                  {"similarity" in m && (
                    <Badge variant="default">
                      {Math.round((m as MemorySearchResult).similarity * 100)}%
                      match
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(m.id)}
                disabled={isPending}
              >
                <Trash2 className="size-4 text-[var(--muted-foreground)]" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
