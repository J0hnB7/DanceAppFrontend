# DanceApp — Computer Use Testing Prompt

## Setup

Before starting, ensure:
- **Backend** is running on `http://localhost:8080`
- **Frontend** dev server is running on `http://localhost:3000`
- Open **Google Chrome** to `http://localhost:3000`

## Application Context

DanceApp is a dance competition management platform with these roles:

| Role | Login method | Entry point |
|------|-------------|-------------|
| **Admin/Organizer** | Email + password at `/login` | `/dashboard` |
| **Judge** | Token URL + PIN | `/judge/[token]/scoring` |
| **Moderator** | Token URL (no auth) | `/moderator/[token]` |
| **Dancer** | Email + password at `/login` | `/profile`, `/competitions` |
| **Public** | No login | `/`, `/competitions`, `/scoreboard/[id]` |

**Admin credentials:** `admin@danceapp.local` / `Admin123!`

---

## Test Flows (pick one or run sequentially)

### Flow 1: Competition Creation Wizard
1. Log in as admin at `/login`
2. Navigate to `/dashboard` → click "New Competition" button
3. **Step 1 — Basic Info**: Fill in competition name, venue, date, registration deadline
4. **Step 2 — Template**: Select "Ballroom Championship" template
5. **Step 3 — Sections**: Verify sections were pre-filled from template. Try drag-reordering a section. Add one new section manually.
6. Submit the wizard
7. **Verify**: Competition appears on dashboard with correct info
8. Screenshot the final competition detail page

### Flow 2: Live Round Control (Admin)
1. Log in as admin, navigate to `/dashboard`
2. Open an existing competition that has sections with rounds
3. Navigate to a section → open a round
4. On the Live Control Dashboard:
   - Check the judge status panel (are judges shown?)
   - Try selecting different heats using the heat selector
   - Check the dance selector tabs
   - Look at the bottom bar actions (start round, send to judges, close round)
5. Screenshot the live control dashboard in its current state
6. **Verify**: All panels render correctly, no blank areas or broken layouts

### Flow 3: Judge Scoring Interface (Mobile View)
1. Resize Chrome window to **390×844** (iPhone 14 Pro size)
2. Navigate to a judge token URL (get one from admin dashboard → section → judges tab)
3. Enter the PIN when prompted
4. On the scoring page:
   - Check touch target sizes (buttons should be at least 44×44px visually)
   - Try tapping score buttons
   - Verify the layout fits within viewport (no horizontal scroll)
   - Check font sizes are readable (body text ≥ 16px)
5. Screenshot the scoring interface
6. **Verify**: Mobile layout is clean, no overflow, buttons are tappable

### Flow 4: Public Competition Browsing
1. Set Chrome window to **1440×900** (desktop)
2. Navigate to `/competitions`
3. Try the filter panel: select a discipline, age category, and level
4. Scroll through results — verify month grouping and card layout
5. Click into a competition detail page
6. Check the registration form (if open) or the propozice (rules) tab
7. Screenshot the competitions list and one detail page
8. **Verify**: Filters work, cards display correctly, no layout breaks

### Flow 5: Schedule Builder (Drag & Drop)
1. Log in as admin, open a competition with sections
2. Navigate to the schedule tab/page
3. Try dragging a section to a different time slot
4. Verify collision detection (drop on occupied slot → should show warning)
5. Try adding a new time slot manually
6. Screenshot the schedule timeline view
7. **Verify**: Drag-and-drop works, visual feedback on drag, no ghost elements left behind

### Flow 6: Settings & 2FA
1. Log in as admin → navigate to `/dashboard/settings`
2. Check profile tab — verify current info displays
3. Go to security section — check 2FA toggle
4. Try the GDPR data export button
5. Screenshot the settings page
6. **Verify**: All tabs render, buttons are interactive, no dead links

### Flow 7: Full E2E — Create Competition and Score It
1. Log in as admin at `/login`
2. Create a new competition via the wizard (use any template)
3. Add at least 2 sections with judges configured
4. Open a section → create/activate a round
5. Note the judge token URL from the judges tab
6. Open a new Chrome tab → navigate to the judge token URL
7. Enter PIN, reach scoring page
8. Submit scores for pairs in the heat
9. Switch back to admin tab → verify scores appear in the heat results panel
10. Close the round → check results calculation
11. Screenshot both the admin view and judge view
12. **Verify**: End-to-end flow works — competition creation through scoring to results

---

## What to Report

After each flow, report:
- **Pass/Fail** for each verification step
- **Screenshots** taken at key points
- **Bugs found**: describe what happened vs. what was expected
- **UI issues**: layout breaks, unreadable text, broken interactions, missing translations
- **Accessibility**: any obvious issues (missing labels, poor contrast, tiny touch targets)

## Important Notes

- The app uses **Czech** and **English** — some labels may be in Czech (e.g., "propozice" = regulations, "soutez" = competition)
- Judge and moderator pages use **token-based URLs** (no cookie auth) — get tokens from admin dashboard
- Real-time features (SSE, WebSocket) require the backend to be running
- The live scoreboard at `/scoreboard/[competitionId]` uses SSE for auto-updates
