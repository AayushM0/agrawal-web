# Design Specification: Secure Real-Time Messaging & Notifications via Pusher Channels

*   **Date**: 2026-08-26
*   **Status**: Approved
*   **Author**: Antigravity

---

## 1. System Architecture & Flows

We are replacing the unauthenticated client-side Supabase Realtime WebSocket client with a secure **Pusher Channels** integration.

```
┌──────────────┐         POST /api/pusher/auth         ┌──────────────────┐
│              ├──────────────────────────────────────►│                  │
│   Browser    │         (Includes Session Cookie)     │  Next.js Server  │
│  (Client)    │◄──────────────────────────────────────┤                  │
│              │        200 OK (Signed Auth Token)     └────────┬─────────┘
└──────┬───────┘                                                │
       │                                                        │
       │  Subscribe with Signed Token                           │ db.getConversationById()
       ▼                                                        ▼
┌──────────────┐                                       ┌──────────────────┐
│              │                                       │                  │
│ Pusher Cloud │                                       │    PostgreSQL    │
│  WebSockets  │                                       │                  │
└──────────────┘                                       └──────────────────┘
```

---

## 2. Authentication & Security (IDOR Defense)

Since all clients connect to Pusher via a shared client library, all authorization decisions are handled at `/api/pusher/auth`. 

1.  **Session Validation**: Reads the secure, HTTP-only `auth_session` cookie. Resolves the caller's UUID member ID using `resolveEffectiveMemberId`.
2.  **Private Channel Routing Checks**:
    *   **Chat Rooms (`private-chat-room-${convId}`)**:
        *   Retrieve the conversation row.
        *   Assert: `memberId === conversation.initiator_id || memberId === conversation.recipient_id`
        *   If assertion fails, return `403 Forbidden`.
    *   **Notifications (`private-user-${memberId}`)**:
        *   Assert: `memberId === callerMemberId`
        *   If assertion fails, return `403 Forbidden`.

---

## 3. Test Seams & Verification Plan (TDD)

We test at three distinct boundaries to ensure correctness and prevent regressions:

### Seam A: `/api/pusher/auth` (HTTP Route)
*   Verify 401 response on missing session cookies.
*   Verify 403 response on IDOR attempts (subscribing to other rooms or notifications).
*   Verify 200 response and signed token payload for authorized subscribers.

### Seam B: Server Actions (Logical Seam)
*   Verify `sendMessage` and `respondToRequest` trigger event dispatches to Pusher.
*   Verify graceful fallback (no crash, successful database insertion) if Pusher API keys are missing.

### Seam C: `useChatRealtime` (React Boundary Seam)
*   Verify client singleton connection re-use.
*   Verify cleanup on room switch or unmount.
*   Verify reporting of connection state and polling loop fallbacks.

---

## 4. Fine-Grained Issue Breakdown

1.  **Issue 1**: Project Dependencies & Configuration Helper (`src/lib/pusher.ts`).
2.  **Issue 2**: Pusher Authorization Route Request parsing `/api/pusher/auth/route.ts` (JSON & Form URL-encoded).
3.  **Issue 3**: Pusher Authorization Route Security Permission Gate (Cookie session validation & IDOR check).
4.  **Issue 4**: Server Action `sendMessage` active room trigger.
5.  **Issue 5**: Server Action `sendMessage` and `respondToRequest` global notification triggers.
6.  **Issue 6**: Client-side connection singleton provider in `useChatRealtime.ts`.
7.  **Issue 7**: Client-side active chat room subscription.
8.  **Issue 8**: Client-side global notification subscription.
9.  **Issue 9**: Messages page UI state merging fix (camelCase preservation & conversation filtering).
10. **Issue 10**: Database clean truncation & complete TDD verification test suite run.
