import fs from "fs/promises";

export const metadata = {
    title: "Search",
    description: "Search page",
};

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
    if (i === -1) return t.slice(0, radius * 2) + (t.length > radius * 2 ? "…" : "");
    const start = Math.max(0, i - radius);
    const end = Math.min(t.length, i + q.length + radius);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < t.length ? "…" : "";
    return prefix + t.slice(start, end) + suffix;
}

async function getData() {
    const file = `${process.cwd()}/python_scripts/csvjson_simple_full.json`;
    try {
        const raw = await fs.readFile(file, "utf8");
        const parsed = JSON.parse(raw);
        // Normalize to { documents, metadata } shape expected below.
        const documents = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.documents)
                ? parsed.documents
                : [];
        return {documents, metadata: {total_documents: documents.length}};
    } catch (e) {
        console.error("Failed to read csvjson_simple_full.json:", e);
        return {documents: [], metadata: {total_documents: 0}};
    }
}

function scoreDocument(doc, q) {
    if (!q) return 0;
    const needle = q.toLowerCase();
    const hay = [
        doc.title,
        doc.text,
        doc.author,
        doc.stream || doc.category,
        Array.isArray(doc.tags) ? doc.tags.join(" ") : "",
    ]
        .join(" \n ")
        .toLowerCase();
    if (!hay.includes(needle)) return 0;
    // simple occurrence count
    const re = new RegExp(escapeRegExp(needle), "g");
    return (hay.match(re) || []).length;
}

export default async function SearchPage({searchParams}) {
    const params = await searchParams;
    const qRaw = params?.q;
    const q = (Array.isArray(qRaw) ? qRaw[0] : (qRaw ?? "")).toString().trim();
    const {documents = []} = await getData();

    let results = [];
    if (q) {
        results = documents
            .map((d) => ({d, s: scoreDocument(d, q)}))
            .filter(({s}) => s > 0)
            .sort((a, b) => {
                if (b.s !== a.s) return b.s - a.s; // relevance first
                return new Date(b.d.date) - new Date(a.d.date); // then recency
            })
            .map(({d}) => d);
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="max-w-5xl mx-auto flex flex-col items-center gap-8">
                {/* Logo */}
                <svg xmlns="http://www.w3.org/2000/svg" width="354" height="78" fill="none" viewBox="0 0 354 78"
                     className="mt-6">
                    <g clipPath="url(#a)">
                        <path
                            fill="#1D1D1D"
                            d="m65.667 41.73-14.844.918C48.8 36.26 43.295 31.699 34.067 31.58c-10.788 0-17.99 6.367-17.99 16.633 0 10.266 7.085 17.238 17.99 17.005 8.881-.233 14.284-3.878 16.642-10.615l14.956.917c-1.91 15.182-17.429 22.363-31.598 22.475C15.748 78.116 0 67.96 0 48.22s15.735-29.428 34.07-29.312c14.169.117 29.688 7.408 31.597 22.829m115.99-21.887h-16.085v56.729h16.085v-56.73Zm-93.014 0H72.557v56.729h16.086v-56.73ZM88.63 0H72.556v10.37h16.072V0Zm265.354 40.144v36.43h-16.113v-7.92c-2.296 6.115-10.051 9.286-20.739 9.286-14.919 0-23.488-6.756-23.488-17.874 0-11.119 8.693-17.413 24.859-17.413h19.317v-1.948c0-6.874-4.795-9.238-14.385-9.238-7.115 0-12.603 2.061-16.852 6.415l-10.958-8.852c4.047-4.088 13.26-9.966 29.181-9.966 18.904 0 29.178 7.445 29.178 21.08Zm-16.297 12.602h-18.362c-6.166 0-9.726 2.52-9.726 6.989 0 4.468 3.836 6.988 10.685 6.988 10.274 0 16.581-5.155 17.403-13.977ZM142.66 19.85l-15.475 41.736-15.472-41.737H95.618l21.022 56.73h21.092l21.023-56.73H142.66Zm79.51 41.78c-3.594 0-6.178-1.136-6.178-6.154v-20.9h16.868V19.831h-27.186c1.423-.287 2.837-1.016 3.927-1.69C216.233 14.497 219.71 7.644 219.825 0h-16.067c0 9.013-5.739 19.83-11.707 19.83h-3.378v14.746h11.247v18.96c0 15.17 4.384 23.043 19.903 23.043h15.734V61.63H222.17Zm51.201 0c-3.592 0-6.179-1.136-6.179-6.154v-20.9h16.868V19.831h-27.197c1.425-.287 2.839-1.016 3.927-1.69C267.428 14.497 270.908 7.644 271.022 0h-16.081c0 9.013-5.738 19.83-11.705 19.83h-3.359v14.746h11.248v18.96c0 15.17 4.381 23.043 19.9 23.043h15.734V61.63h-13.388ZM181.643 0h-16.071v10.37h16.071V0Z"
                        />
                    </g>
                    <defs>
                        <clipPath id="a">
                            <path fill="#fff" d="M0 0h354v78H0z"/>
                        </clipPath>
                    </defs>
                </svg>

                {/* Search bar */}
                <form action="/search" method="GET" className="w-full max-w-xl mx-auto flex items-stretch gap-2">
                    <input
                        type="search"
                        name="q"
                        defaultValue={q}
                        placeholder="Search articles, tags, authors…"
                        className="flex-1 h-12 rounded-full border border-black/10 dark:border-white/20 bg-white/80 dark:bg-black/20 px-4 text-base outline-none focus:ring-2 focus:ring-[#EAFE40] dark:focus:ring-white/30"
                        suppressHydrationWarning
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        className="h-12 px-10 rounded-full bg-[#EAFE40] text-black font-normal hover:opacity-90 active:opacity-80 transition"
                    >
                        Search
                    </button>
                </form>

                {/* Results */}
                <div className="w-full mx-auto text-center mt-2 self-start">
                    {!q && (
                        <p className="opacity-70 text-sm">Type a keyword and press Search to find articles.</p>
                    )}
                    {q && (
                        <p className="opacity-70 text-sm mb-4">
                            {results.length} result{results.length === 1 ? "" : "s"} for "{q}"
                        </p>
                    )}
                </div>

                {q && results.length === 0 && (
                    <div className="w-full text-center opacity-80 py-16 border border-dashed rounded-xl">
                        No results. Try a different keyword.
                    </div>
                )}

                {results.length > 0 && (
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {results.map((doc) => (
                            <article key={doc.id}
                                     className="group rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur shadow-sm hover:shadow-md transition overflow-hidden">
                                <div className="p-5 flex flex-col gap-3">
                                    <div className="flex items-center justify-between gap-2">
                    <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-black/5 dark:bg-white/10">
                      {doc.stream || doc.category}
                    </span>
                                        <time className="text-xs opacity-60" dateTime={doc.date}>{doc.date}</time>
                                    </div>

                                    <h3
                                        className="text-lg font-semibold leading-snug"
                                        dangerouslySetInnerHTML={{__html: highlight(doc.title, q)}}
                                    />

                                    <p
                                        className="text-sm opacity-80"
                                        dangerouslySetInnerHTML={{__html: highlight(excerpt(doc.text, q), q)}}
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
