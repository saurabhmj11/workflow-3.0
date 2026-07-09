# Task p6-7: Build Onboarding Flow for OpenWorkflow

## Agent: Main
## Status: COMPLETED

## Summary
Built a complete onboarding flow for new users with a 4-step wizard dialog, state management hook, and integration into the main page and user navigation.

## Files Created
1. `/src/hooks/use-onboarding.ts` — Hook to track onboarding state via localStorage + workflow check
2. `/src/components/onboarding/onboarding-wizard.tsx` — Multi-step onboarding dialog (4 steps)

## Files Modified
1. `/src/app/page.tsx` — Integrated OnboardingWizard and useOnboarding hook
2. `/src/components/auth/user-nav.tsx` — Added "Restart Onboarding" menu item

## Key Implementation Details

### useOnboarding Hook
- Checks `localStorage.getItem('openworkflow_onboarding_completed')` on mount
- If not completed, fetches `/api/workflows` to check if any exist (skip onboarding if they do)
- Uses `useRef` guard + `queueMicrotask` to avoid synchronous setState in effect (strict lint compliance)
- Returns `showOnboarding`, `isLoading`, `completeOnboarding`, `resetOnboarding`

### OnboardingWizard (4 Steps)
1. **Welcome** — Gradient heading, 3 value proposition cards (AI Employees, Smart Memory, Real Integrations)
2. **Choose Your First AI Employee** — 4 cards: Support Employee (Popular badge), SDR Employee, Recruiter, Custom
3. **Connect Your Tools** — 5 integration cards with simulated connect animation (1.2s spinner overlay)
4. **See It In Action** — 3-step pipeline explanation with "Watch the Demo" and "Start Building" buttons

### Navigation
- Progress bar with gradient violet-to-cyan indicator
- Step indicator dots with checkmarks for completed steps
- Back/Next buttons, Skip on every step
- Smooth CSS transitions between steps (opacity + translate-y)

### Template Loading
- Step 2 selections map to `WORKFLOW_TEMPLATES` entries
- "Start Building" loads the selected template to canvas with auto-layout
- "Watch the Demo" loads template + opens AI Employee Demo dialog

### UserNav Integration
- Added `onResetOnboarding` prop to UserNav
- "Restart Onboarding" menu item with RotateCcw icon
- Passed `resetOnboarding` from page.tsx

## Build Verification
- `bun run lint` — passes clean
- Dev server running, `/` returns 200
