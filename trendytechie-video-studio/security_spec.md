# Security Specification for LTX Video Collaboration Hub

This security specification outlines the security constraints, relational rules, data validation types, and threat model (The "Dirty Dozen" payloads) for the Cloud Firestore setup.

## 1. Data Invariants
1. **User Ownership & Identity Isolation**: Users can only write and update their own user profiles. Accessing other profiles requires a valid active session (`isSignedIn()`).
2. **Project Collaboration Gatekeeping**: Projects can only be created by an authenticated user, who becomes the immutable `ownerId`. Collaborators must be explicitly added to `collaboratorIds` (up to a limit of 10) to obtain write/edit access.
3. **Restricted Collaborator Privileges**: Collaborators can edit metadata (name, description, tracks), but are strictly forbidden from modifying the user access lists (`collaboratorIds`) or changing the original `ownerId`.
4. **Relational Track Integrity**: Tracks are stored as sub-resources of a Project. A track cannot be read, created, updated, or deleted unless the requestor is the owner or an authorized collaborator of the parent Project.
5. **Temporal Sanity**: `createdAt` remains immutable upon project or track creation. `updatedAt` is synchronized strictly to `request.time` (the server's internal timestamp clock) during any update.

---

## 2. The "Dirty Dozen" Malicious Payloads
Here are the 12 specific JSON payloads designed to violate identity, integrity, or structure, which must be blocked with `PERMISSION_DENIED`:

### Payload 1: Claiming Hostile Profile Ownership
An attacker tries to create a user profile for a target user ID.
```json
// POST /users/target_user_123
{
  "userId": "target_user_123",
  "displayName": "Spoofed User",
  "email": "victim@malicious.com",
  "createdAt": "2026-06-12T20:25:00Z"
}
```
*Expected Result*: Rejected because client auth ID does not match path variable `userId` or payload `userId`.

### Payload 2: Injecting Unverifiable Private Emails
An attacker with `email_verified == false` tries to register.
*Expected Result*: Rejected by verification check.

### Payload 3: Spoofing Project Ownership upon Creation
Attacker tries to create a project claiming another user is the owner, or creating it on behalf of an admin.
```json
// POST /projects/project_abc
{
  "projectId": "project_abc",
  "ownerId": "victim_admin_uid",
  "name": "Stealth Project",
  "description": "Attacker owned",
  "aspectRatio": "16:9",
  "duration": 60,
  "collaboratorIds": []
}
```
*Expected Result*: Rejected because payload `ownerId` does not match `request.auth.uid`.

### Payload 4: Arbitrary Creator Privilege Escalation on Update
A collaborator attempts to swap the `ownerId` to themselves to hijack full ownership.
```json
// PATCH /projects/project_abc
{
  "ownerId": "malicious_collaborator_uid"
}
```
*Expected Result*: Rejected because `ownerId` must remain immutable (`incoming().ownerId == existing().ownerId`).

### Payload 5: Overriding Collaborative Access Control (Self-Addition)
Non-authorized user attempts to inject their ID into a project's `collaboratorIds`.
*Expected Result*: Rejected because the actor is neither the owner nor current collaborator.

### Payload 6: Size Injection on Project Names
Attacker attempts a Denial of Wallet or storage exhaustion attack by saving a massive text blob as a project name.
```json
{
  "name": "MASSIVE_STRING_REPEATED_MIN_1MB..."
}
```
*Expected Result*: Rejected by `.size() <= 200` constraint check.

### Payload 7: Denial of Wallet via Collaborator List Inflation
Attacker tries to add 10,000 users to `collaboratorIds`.
*Expected Result*: Rejected by `collaboratorIds.size() <= 10` guard.

### Payload 8: Corrupting Aspect Ratio with Unsupported Enums
Attacker tries to inject a custom layout format.
```json
{
  "aspectRatio": "32:9-panoramic-extreme"
}
```
*Expected Result*: Rejected by `aspectRatio in ['16:9', '9:16', '1:1']` check.

### Payload 9: Orphaned Track Creation (Missing Parent Project validation)
Attacker tries to create a timeline track for a project that does not exist or they do not belong to.
*Expected Result*: Rejected because `get(/databases/$(database)/documents/projects/$(projectId))` will fail or confirm user is not a member.

### Payload 10: Client Time Injection (createdAt Manipulation)
Attacker tries to pre-date project creation.
```json
{
  "createdAt": "1999-12-31T23:59:59Z"
}
```
*Expected Result*: Rejected because `createdAt` must match `request.time`.

### Payload 11: Hostile Track Hijacking
Collaborator on another project tries to modify tracks of a secure private project they are blocklisted from.
*Expected Result*: Rejected because project lookups verify membership.

### Payload 12: Ghost Field Inject (The Shadow Update)
Attacker tries to submit a payload containing extra security override attributes (`isSystemVerified: true`).
```json
{
  "name": "My Project",
  "isSystemVerified": true
}
```
*Expected Result*: Rejected by `affectedKeys().hasOnly(...)` during updates or strict `keys().size()` on creation.

---

## 3. Test Runner Specification
Tests are written in `/src/security.test.ts` or simulated by strict unit validations, ensuring that these exact scenarios output `PERMISSION_DENIED`.
