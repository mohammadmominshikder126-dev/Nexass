# NexasWorld Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Default Deny**: Any unmatched path or unauthenticated/unverified access must be denied by default.
2. **PII & Wallet Isolation**: `/users/{userId}` contains sensitive phone numbers, balances, and bank card details; `get` is restricted strictly to `isOwner(userId)` or `isAdmin()`, and `list` is restricted strictly to `isBootstrapAdmin()`.
3. **No Self-Privilege Escalation or Free Balance Injection**: Users cannot create or update their own `rechargeBalance`, `withdrawalBalance`, or `invitedEarnings` above `registrationBonus` / existing values without admin approval, nor create `/admins/{uid}` documents.
4. **Immutable Ledger & Ownership**: `/users/{userId}/transactions/{transactionId}` and `/users/{userId}/products/{productId}` require valid `userId == request.auth.uid`, valid ID format (`^[a-zA-Z0-9_\-]+$`, <= 128 chars), and immutable `userId`/`createdAt`.
5. **Deposit & Withdraw Integrity**: Users can only create `/deposits/{depositId}` with `status == 'Pending'` and `/withdrawals/{withdrawId}` with `status == 'Processing'` for their own `uid`, and cannot self-approve or modify status after creation; only `isAdmin()` may transition terminal states.
6. **Verified Identity & Strict Schema**: All writes require `request.auth != null && request.auth.token.email_verified == true` and strict `hasAll` / `hasOnly` key checks with bounded string and array sizes.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Read/Write**: Read `/users/usr_1` or `/deposits/dep_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Write `/config/app` with `email: 'nexasworld5@gmail.com'` and `email_verified: false` -> `PERMISSION_DENIED`.
3. **Ghost Field Shadow Injection**: Create `/users/usr_1` with an extra `isAdmin: true` field -> `PERMISSION_DENIED`.
4. **Self-Balance Inflation on Signup**: Create `/users/usr_1` with `rechargeBalance: 999999` -> `PERMISSION_DENIED`.
5. **User Balance Tampering on Update**: Owner updates `/users/usr_1` modifying `withdrawalBalance` -> `PERMISSION_DENIED`.
6. **Cross-User PII Snooping**: `usr_2` attempts `get` on `/users/usr_1` -> `PERMISSION_DENIED`.
7. **Blanket Deposit List Scraping**: `usr_2` runs unfiltered `list` on `/deposits` -> `PERMISSION_DENIED`.
8. **Self-Confirming Deposit**: `usr_1` creates `/deposits/dep_1` with `status: 'Confirmed'` -> `PERMISSION_DENIED`.
9. **Post-Terminal Status Flip**: Non-admin attempts to update `/deposits/dep_1` from `Pending` to `Confirmed` -> `PERMISSION_DENIED`.
10. **ID Poisoning Attack**: Create `/deposits/<1500-char-junk>` -> `PERMISSION_DENIED`.
11. **Oversized String Exhaustion**: Create `/deposits/dep_2` with `txId` > 128 chars -> `PERMISSION_DENIED`.
12. **Unauthorized Admin Role Write**: Non-admin creates `/admins/usr_2` -> `PERMISSION_DENIED`.
