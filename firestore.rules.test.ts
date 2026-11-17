/**
 * Payload-First Security TDD Spec (Dirty Dozen Verification Suite)
 * Evaluates all 12 adversarial attack vectors against firestore.rules invariants.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  guardEnforcing: string;
}

export const DIRTY_DOZEN_TESTS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Read/Write',
    collection: '/users/usr_1',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: 'isVerifiedUser() requires request.auth != null',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof',
    collection: '/config/app',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: 'isBootstrapAdmin() enforces request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'Ghost Field Shadow Injection',
    collection: '/users/usr_1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: 'isValidUserProfile() checks data.keys().hasOnly(...)',
  },
  {
    id: 4,
    name: 'Self-Balance Inflation on Signup',
    collection: '/users/usr_1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: 'rechargeBalance <= 150 && withdrawalBalance == 0 && invitedEarnings == 0',
  },
  {
    id: 5,
    name: 'User Balance Tampering on Update',
    collection: '/users/usr_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: 'affectedKeys().hasOnly(...) forbids balance mutation by non-admin',
  },
  {
    id: 6,
    name: 'Cross-User PII Snooping',
    collection: '/users/usr_1',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: 'isOwner(userId) || isAdmin()',
  },
  {
    id: 7,
    name: 'Blanket Deposit List Scraping',
    collection: '/deposits',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: 'existing().userId == request.auth.uid || isBootstrapAdmin()',
  },
  {
    id: 8,
    name: 'Self-Confirming Deposit',
    collection: '/deposits/dep_1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: "incoming().status == 'Pending'",
  },
  {
    id: 9,
    name: 'Post-Terminal Status Flip',
    collection: '/deposits/dep_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: "isAdmin() && existing().status == 'Pending'",
  },
  {
    id: 10,
    name: 'ID Poisoning Attack (1.5KB ID)',
    collection: '/deposits/' + 'x'.repeat(1500),
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: "isValidId(id) enforces size() <= 128 && matches('^[a-zA-Z0-9_\\\\-]+$')",
  },
  {
    id: 11,
    name: 'Oversized String Exhaustion',
    collection: '/deposits/dep_2',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: 'isValidDeposit() enforces data.txId.size() <= 128',
  },
  {
    id: 12,
    name: 'Unauthorized Admin Role Write',
    collection: '/admins/usr_2',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    guardEnforcing: 'isBootstrapAdmin() + isValidAdminRole()',
  },
];
