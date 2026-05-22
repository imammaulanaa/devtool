# Contributing to DevTools Hub

Thanks for considering a contribution! New tools, fixes, and improvements are all welcome.

---

## Workflow

We use a **feature branch + PR** model. **Direct pushes to `main` are blocked** — all changes go through a Pull Request that must pass CI.

### Step-by-step

1. **Sync `main`** and create a branch:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** — see [Adding a new tool](#adding-a-new-tool) below.

3. **Test locally**:
   ```bash
   npm run dev      # Visual test in browser
   npm run lint     # Lint check
   npm run build    # Build + type-check
   ```

4. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(pgp): add encrypt mode"
   ```

5. **Push** and **open a PR** to `main`.

6. **Wait for CI** to pass (lint + build). The status check is required to merge.

7. **Get review** — at least one approval required.

8. **Merge** — use **"Squash and merge"** to keep `main` history linear and clean.

---

## Branch naming

| Prefix       | Use case                                       |
|--------------|------------------------------------------------|
| `feat/`      | New features or new tools                      |
| `fix/`       | Bug fixes                                      |
| `refactor/`  | Code restructuring with no behavior change     |
| `docs/`      | Documentation only                             |
| `chore/`     | Build config, dependencies, tooling            |
| `style/`     | Code formatting, no logic change               |

Examples:
- `feat/helm-hpa-support`
- `fix/cidr-slash-32-edge-case`
- `refactor/extract-pgp-modes`

---

## Commit message format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body — optional>

<footer — optional>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`, `test`

**Scope**: tool name or area (e.g. `pgp`, `cidr`, `helm`, `ui`, `ci`)

**Subject**: imperative present tense ("add" not "added"), no period at end.

Examples:

```
feat(helm): add HPA scaffolding to chart generator
fix(cidr): handle /32 single-host edge case
docs(readme): update tools list after pgp refactor
refactor(pgp): extract sub-modes into pgp/ subdirectory
chore(deps): bump openpgp from 5.10 to 5.11
```

---

## Adding a new tool

1. **Create the component** at `src/tools/YourToolName.tsx`:
   ```tsx
   export default function YourToolName() {
     return <div>Your tool UI</div>;
   }
   ```

2. **Register in `src/App.tsx`**:
   - Import the component:
     ```tsx
     import YourToolName from '@/tools/YourToolName';
     ```
   - Add an icon import from `lucide-react`
   - Add a `TabsTrigger`:
     ```tsx
     <TabsTrigger value="yourtool" className="gap-2">
       <YourIcon className="w-4 h-4" />
       Your Tool
     </TabsTrigger>
     ```
   - Add a `TabsContent` with `Card > CardHeader + CardContent > YourToolName`
   - Update the TabsList `grid-cols-*` if the total count changes the layout
   - Update the header subtitle and mobile tagline tool count

3. **Update [`README.md`](README.md)** — add the tool to the tools table with a one-line description.

4. **Test thoroughly**:
   ```bash
   npm run dev      # Try the new tool in a real browser
   npm run build    # Make sure it compiles
   ```

5. **Open a PR**.

---

## Code style

- **TypeScript** for all `.tsx` files. No `.jsx` or `.js`.
- **Tailwind utility classes** for styling. Avoid custom CSS files.
- **shadcn/ui primitives** for buttons, cards, inputs, etc. They're already in `src/components/ui/`.
- **lucide-react** for icons.
- Keep tools **self-contained** — one tool per file. Sub-modes can go in a subdirectory (see `tools/pgp/` for an example).
- Lazy-load heavy dependencies:
  ```tsx
  const openpgp = await import('openpgp');
  ```
- Prefer `useMemo` for derived state over `useEffect` + `setState`.
- Show clear error messages to the user — try/catch around external library calls.

---

## Privacy commitment

DevTools Hub is **100% client-side**. **No tool may ever**:

- Make HTTP requests to external APIs with user input
- Send user data to any server
- Use third-party analytics or tracking scripts
- Embed remote iframes

If a feature requires server interaction, **it doesn't fit this project**. The trust users have in this tool depends on this guarantee.

Heavy libraries (like `openpgp`, `jszip`) **must be lazy-loaded** via `await import('...')` to keep the initial bundle small.

---

## Pull Request checklist

Before requesting review, make sure:

- [ ] Branch is up to date with `main`
- [ ] `npm run build` succeeds locally
- [ ] `npm run lint` passes locally
- [ ] Tested manually in the browser
- [ ] Screenshots attached for UI changes
- [ ] No new dependency added (or you've justified it in the PR description)
- [ ] README updated if you added a new tool
- [ ] All processing stays client-side

---

## For maintainers — branch protection setup

This should be configured **once** in GitHub repo settings to enforce the workflow described above.

**Settings → Branches → Add branch ruleset** (or "Add rule" for the classic UI):

- **Branch name pattern**: `main`
- ✅ **Restrict deletions** — block deletion of `main`
- ✅ **Require a pull request before merging**
  - Required approvals: **1** (or 0 if you're a solo maintainer)
  - ✅ Dismiss stale approvals on new commits
- ✅ **Require status checks to pass**
  - Required check: `Lint & Build` (from `ci.yml`)
  - ✅ Require branches to be up to date before merging
- ✅ **Block force pushes**
- ✅ **Require linear history** (recommended — pairs with "Squash and merge")

Optional but recommended:
- ✅ Require conversation resolution before merging
- ✅ Require signed commits

---

## Questions?

Open an [issue](https://github.com/imammaulanaa/devtool/issues) or [start a discussion](https://github.com/imammaulanaa/devtool/discussions).