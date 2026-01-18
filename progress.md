# Progress Log

## 2026-01-18: Fixed Electron Build Hanging Issue

### Problem
Running `npm run electron:build` would hang during the Next.js build step and never complete.

### Root Cause
Next.js with `output: 'export'` (static export) cannot build projects that contain API routes. The presence of `src/app/api/expression-maps/route.ts` caused the build to hang indefinitely.

**Why this happened now:**
- The API route was added to support the template builder feature
- Recent commit `afd9c0f` fixed the template builder to use the correct expression maps folder
- This API route is needed for dev mode (`npm run dev`) but conflicts with static export builds
- The build likely hasn't been attempted since these changes, or Next.js became stricter about this incompatibility

### Solution
Created a custom build script (`build-electron.js`) that:
1. Temporarily renames `route.ts` → `route.ts.dev` to hide it from Next.js
2. Runs `next build` (completes successfully without the API route)
3. Runs `electron-builder` to create the installer
4. Restores `route.ts` back to its original name

Updated `package.json` scripts:
- `electron:build` → `node build-electron.js`
- `electron:pack` → `node build-electron.js --dir`

### Why This Works
- **Dev mode:** API route exists and works normally
- **Production Electron app:** Doesn't use the Next.js API route at all - the `electron/main.js` file has its own `handleApiRequest()` function (line 266) that serves the expression maps directly
- **Build time:** API route is temporarily hidden so Next.js can create the static export

### Files Modified
- `build-electron.js` (new) - Custom build script with API route handling
- `package.json` - Updated electron:build and electron:pack scripts
- `next.config.js` - Reverted to original simple config (no changes needed)

### Testing
Build now completes successfully:
```
npm run electron:build
```

Output: `dist\Cubby Remote Setup 1.1.0.exe`

### Notes
- No changes to application code were needed
- The API route file stays in the codebase for dev mode
- Production app functionality unchanged (still uses Electron's API handler)
- If you get "EPERM" errors during build, close `route.ts` in your IDE first

---

## 2026-01-18: Cleaned Up Expression Maps from Repository

### Problem
The `expression-maps/` folder contained 88 committed expression map files (Vienna Symphonic Prime, Synchron Strings, Cremona Quartet, Met Ark) totaling ~97KB. These were personal library files that should not be in the repository.

### Why This Happened
The folder was created during development for testing and the files were accidentally committed. The folder should only exist locally for each user with their own expression maps.

### Solution
1. Removed all 88 expression map files from git tracking (`git rm -r expression-maps/`)
2. Added `expression-maps/` to `.gitignore` to prevent future commits
3. Updated README.md to clarify:
   - The folder is auto-created by the app when first run
   - Users add their own `.expressionmap` files locally
   - Not included in the repository

### Why This Is Better
- **Cleaner repository:** Removed 97,045 lines of XML files
- **User privacy:** Personal expression map libraries stay local
- **Flexibility:** Each user has their own expression maps without conflicts
- **Auto-creation:** Code in `src/app/api/expression-maps/route.ts` (line 36) and `electron/main.js` (line 22) creates the folder when needed

### Files Modified
- `.gitignore` - Added `expression-maps/` exclusion
- `README.md` - Added note about auto-created folder
- Removed 88 `.expressionmap` files from git tracking

### For Users
**Development mode:**
- Run the app - `expression-maps/` folder is created automatically
- Add your `.expressionmap` files there
- Organize in subfolders if desired (e.g., `Strings/`, `Brass/`)

**Standalone app:**
- Use system tray menu: "Add Expression Maps..." or "Open Expression Maps Folder"
- Location: `C:\Users\USERNAME\AppData\Local\Programs\cubby-remote\resources\expression-maps\`
