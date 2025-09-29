"use client";

import { useState, useEffect } from "react";

export default function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) return;

    const searchDocuments = async (query, topK = 5) => {
      const serverUrl = "http://localhost:5080";

      try {
        const response = await fetch(`${serverUrl}/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query.trim(),
            top_k: topK,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const results = await response.json();
        return results;
      } catch (error) {
        console.error("Search API error:", error);
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        return {
          error: true,
          message: error.message,
          results: [],
        };
      }
    };

    const performSearch = async () => {
      console.log("Starting search for query:", query);
      setLoading(true);
      setError(null);

      const searchResponse = await searchDocuments(query, 5);
      console.log("Search response:", searchResponse);

      if (searchResponse.error) {
        setError(searchResponse.message);
        setResults([]);
      } else {
        // Transform the API response to match the expected format
        const transformedResults = searchResponse.results
          .map((result) => ({
            id: result.document_id,
            title: result.title,
            text: result.text_preview,
            author: result.author,
            date: result.date,
            stream: result.category,
            category: result.category,
            tags: result.tags || [],
            similarity_score: result.similarity_score,
          }))
          .filter((doc) => doc.title && doc.title.trim() !== ""); // Filter out documents without titles
        setResults(transformedResults);
      }

      setLoading(false);
    };

    performSearch();
  }, [query]);

  if (loading) {
    return (
      <div className="w-full text-center py-16">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        <p className="mt-4 opacity-70">Searching...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center py-16 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-xl">
        <p className="text-red-600 dark:text-red-400 font-medium">
          Search Error
        </p>
        <p className="text-red-500 dark:text-red-300 text-sm mt-2">{error}</p>
        <p className="text-red-400 dark:text-red-200 text-xs mt-2">
          Make sure the Python server is running on port 5080
        </p>
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className="w-full text-center opacity-80 py-16 border border-dashed rounded-xl">
        No results. Try a different keyword.
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="w-full text-center py-16">
        <p className="opacity-70 text-sm">
          Type a keyword and press Search to find articles.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full mx-auto text-center mt-2 self-start">
        <p className="opacity-70 text-sm mb-4">
          {results.length} result{results.length === 1 ? "" : "s"} for "{query}"
        </p>
      </div>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((doc) => (
          <SearchResultCard key={doc.id} doc={doc} query={query} />
        ))}
      </div>
    </>
  );
}

function SearchResultCard({ doc, query }) {
  function escapeHtml(str = "") {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegExp(str = "") {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(text = "", q = "") {
    if (!q) return escapeHtml(text);
    const safe = escapeHtml(text);
    const re = new RegExp(`(${escapeRegExp(q)})`, "gi");
    return safe.replace(re, '<mark class="bg-yellow-200 text-black">$1</mark>');
  }

  function excerpt(text = "", q = "", radius = 120) {
    const t = text || "";
    if (!q) return t.slice(0, radius * 2) + (t.length > radius * 2 ? "…" : "");
    const i = t.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1)
      return t.slice(0, radius * 2) + (t.length > radius * 2 ? "…" : "");
    const start = Math.max(0, i - radius);
    const end = Math.min(t.length, i + q.length + radius);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < t.length ? "…" : "";
    return prefix + t.slice(start, end) + suffix;
  }

  return (
    <article className="group rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          {/* <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-black/5 dark:bg-white/10">
            {doc.stream || doc.category}
          </span> */}
          <time className="text-xs opacity-60" dateTime={doc.date}>
            {doc.date}
          </time>
        </div>

        <h3
          className="text-lg font-semibold leading-snug"
          dangerouslySetInnerHTML={{
            __html: highlight(doc.title, query),
          }}
        />

        <p
          className="text-sm opacity-80"
          dangerouslySetInnerHTML={{
            __html: highlight(excerpt(doc.text, query), query),
          }}
        />

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs opacity-70">By {doc.author}</span>
        </div>

        {Array.isArray(doc.tags) && doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {doc.tags.map((tag) => (
              <a
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="text-xs rounded-full px-2 py-1 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition"
              >
                #{tag}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
