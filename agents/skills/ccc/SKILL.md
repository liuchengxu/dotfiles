---
name: ccc
description: >
  Find code by behavior or concept, or manage the ccc/cocoindex-code index. Exact identifiers, known paths, and literal searches use direct tools without indexing.
---

# ccc - Semantic Code Search & Indexing

`ccc` is the CLI for CocoIndex Code, providing semantic search over the current codebase and index management.

Use direct read/search tools for known files, exact identifiers, and literal
text. Those lookups do not require ccc initialization or indexing.

## Ownership

When ccc is needed, the agent owns its lifecycle for the current project —
initialization, indexing, and searching. Do not ask the user to perform these
steps; handle them automatically within the existing access permissions.

- **Initialization**: If `ccc search` or `ccc index` fails with an initialization error (e.g., "Not in an initialized project directory"), run `ccc init` from the project root directory, then `ccc index` to build the index, then retry the original command.
- **Index freshness**: Keep the index up to date by running `ccc index` (or `ccc search --refresh`) when the index may be stale — e.g., before the first semantic search in a session, or after making significant code changes relevant to the next semantic search (new files, refactors, renamed modules). There is no need to re-index between consecutive searches if no code was changed in between.
- **Installation**: If `ccc` itself is not found (command not found), refer to [management.md](references/management.md) for installation instructions and inform the user.

## Searching the Codebase

To perform a semantic search:

```bash
ccc search <query terms>
```

The query should describe the concept, functionality, or behavior to find, not exact code syntax. For example:

```bash
ccc search database connection pooling
ccc search user authentication flow
ccc search error handling retry logic
```

### Filtering Results

- **By language** (`--lang`, repeatable): restrict results to specific languages.

  ```bash
  ccc search --lang python --lang markdown database schema
  ```

- **By path** (`--path`): restrict results to a glob pattern relative to project root. If omitted, defaults to the current working directory (only results under that subdirectory are returned).

  ```bash
  ccc search --path 'src/api/*' request validation
  ```

### Pagination

Results default to the first page. To retrieve additional results:

```bash
ccc search --offset 5 --limit 5 database schema
```

If all returned results look relevant, use `--offset` to fetch the next page — there are likely more useful matches beyond the first page.

### Working with Search Results

Search results include file paths and line ranges. To explore a result in more detail:

- Use the editor's built-in file reading capabilities (e.g., the `Read` tool) to load the matched file and read lines around the returned range for full context.
- When working in a terminal without a file-reading tool, use `sed -n '<start>,<end>p' <file>` to extract a specific line range.

## Settings

To view or edit embedding model configuration, include/exclude patterns, or language overrides, see [settings.md](references/settings.md).

## Management & Troubleshooting

For installation, initialization, daemon management, troubleshooting, and cleanup commands, see [management.md](references/management.md).

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before searching or managing the index, confirmed the requested concept, search boundary, and index action were clear, necessary, and within scope.
- [ ] Used direct search for known paths or exact text, and used ccc only for behavior or concept discovery.
- [ ] Refreshed or initialized the index when needed and inspected enough source around each useful result to confirm relevance.
- [ ] Reported the useful locations and any installation, indexing, freshness, or coverage limit.
