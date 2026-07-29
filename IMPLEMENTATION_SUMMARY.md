# Implementation Summary: Telegram Review & Web Quiz Modes

## Completed Features

### 1. Telegram Multi-Choice Review (`/review` command)

#### Files Created:

- `supabase/functions/_shared/distractor-service.ts` - Smart distractor selection (prioritizes related terms, then random)
- `supabase/functions/_shared/review-session.ts` - In-memory session state management
- `supabase/functions/_shared/review-service.ts` - Review session orchestration
- `supabase/migrations/20260730000000_review_session_rpcs.sql` - Database RPCs for fetching multiple terms

#### Files Modified:

- `supabase/functions/_shared/constants.ts` - Added review-related messages
- `supabase/functions/_shared/telegram-api.ts` - Added review message formatting functions
- `supabase/functions/telegram-webhook/index.ts` - Added `/review` command handler and callback routing

#### Features:

- **Command**: `/review [known|unknown] [n]`
  - Default: 5 unknown terms
  - Examples: `/review`, `/review known 10`, `/review unknown all`
- **Session-based**: Tracks progress through multiple questions
- **Smart distractors**: Prioritizes related terms from `term_relationships`, fills with random domain terms
- **4-option MCQ**: Shows definition, user picks correct term name
- **Auto-progression**: Questions advance automatically with 1.5s delay
- **Final score**: Shows summary with encouragement based on performance
- **Session timeout**: 30-minute expiry for inactive sessions

### 2. Web Quiz Simple Mode (Definition → Term)

#### Files Created:

- `lib/quiz/generate-simple.ts` - Simple quiz generator using existing dataset

#### Files Modified:

- `lib/quiz/types.ts` - Added `QuizQuestionStyle` type
- `lib/quiz/session-storage.ts` - Added `questionStyle` to session state
- `components/jargon/quiz/quiz-page.tsx` - Added question style selector UI
- `app/(private)/jargon/quiz/actions.ts` - Route between AI and simple modes

#### Features:

- **Question Style Selector**: Radio buttons to choose between AI and Simple modes
- **Simple Mode**: Shows exact definition from database, user picks term name
- **Smart Distractors**: Same logic as Telegram (related terms first, then random)
- **No AI Required**: Works without LLM API key configured
- **4 Options**: Correct term + 3 distractors, shuffled
- **Session Persistence**: Saves question style for resume

## Architecture Decisions

### Distractor Selection Algorithm

Both Telegram and web use the same smart selection strategy:

1. Query `term_relationships` for related terms (both incoming and outgoing)
2. Shuffle and take up to N related terms
3. Fill remaining slots with random terms from same domain
4. Shuffle final list

### Session Management (Telegram)

- **In-memory Map**: `chatId` → `ReviewSession`
- **Pre-fetch terms**: All terms fetched at session start
- **No database state**: Session lives only in memory
- **Auto-cleanup**: Sessions expire after 30 minutes or on completion

### Quiz Generation Routing (Web)

- **Simple mode**: Direct database queries, no AI
- **AI mode**: Existing LLM flow unchanged
- **Shared types**: Both modes produce same `QuizQuestion` format
- **Fallback handling**: Simple mode works when AI credentials missing

## Database Changes

### New RPCs (Migration `20260730000000_review_session_rpcs.sql`):

- `pick_multiple_unknown_terms(user_id, limit)` - Fetch N unknown terms with relationships
- `pick_multiple_known_terms(user_id, limit)` - Fetch N known terms with relationships
- `count_known_terms(user_id)` - Count known terms in review pool

All RPCs include:

- Full term details (definition, example, discussion, controversy)
- Domain name
- Relationships as JSONB (with direction, type, related term name, description)

## Testing Notes

### Manual Testing Required:

1. **Telegram**:
   - Run migration: `supabase migration up`
   - Test `/review` with various parameters
   - Verify session flow (multiple questions, score tracking)
   - Test distractor selection with terms that have relationships
   - Test "no terms available" cases

2. **Web Quiz**:
   - Test question style selector in picker UI
   - Generate simple quiz and verify questions show definitions
   - Verify distractors include related terms when available
   - Test session persistence with simple mode
   - Verify simple mode works without AI credentials

### Edge Cases Handled:

- Telegram: Empty term pools, invalid parameters, expired sessions
- Web: No related terms available, small domain (< 4 terms)
- Both: Session resume/discard, progress tracking

## Files Summary

### Created (7 files):

1. `supabase/functions/_shared/distractor-service.ts`
2. `supabase/functions/_shared/review-session.ts`
3. `supabase/functions/_shared/review-service.ts`
4. `supabase/migrations/20260730000000_review_session_rpcs.sql`
5. `lib/quiz/generate-simple.ts`

### Modified (8 files):

1. `supabase/functions/_shared/constants.ts`
2. `supabase/functions/_shared/telegram-api.ts`
3. `supabase/functions/telegram-webhook/index.ts`
4. `lib/quiz/types.ts`
5. `lib/quiz/session-storage.ts`
6. `components/jargon/quiz/quiz-page.tsx`
7. `app/(private)/jargon/quiz/actions.ts`

## Next Steps

1. Deploy database migration
2. Test Telegram `/review` command
3. Test web simple quiz mode
4. Monitor session behavior and adjust timeout if needed
5. Consider adding review statistics tracking (future enhancement)
