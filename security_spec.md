# Security Specification

## Data Invariants
1. A caution cannot exist without a valid cycle ID.
2. A user profile's `perfil` can only be set by an administrator.
3. Signatures are immutable once created.
4. Cautions can only be modified if status is `RASCUNHO` (by Militar) or `DEVOLUCAO_INICIADA` (by Militar) or `AGUARDANDO_RECEBIMENTO_LOGISTICA` (by Logistica). Once `DESCAUTELADA` or `CANCELADA`, they are locked.
5. Audit events are append-only.

## Dirty Dozen Payloads
1. User profile creation with `perfil: "ADMINISTRADOR"` by non-admin.
2. Modification of `perfil` by a `MILITAR` user.
3. Creation of a cycle by a non-admin.
4. Modification of a closed cycle.
5. Creation of a caution where `responsibleUserId` is someone else.
6. Modification of a caution by a user who is not `responsibleUserId` or a `LOGISTICA` user.
7. Update of a caution's status to `DESCAUTELADA` without `LOGISTICA` role.
8. Modification of a signature.
9. Deletion of a caution (not allowed).
10. Update to an `auditEvents` document.
11. Reading PII (email) of other users by a non-admin.
12. Creation of an item in a caution that is already `CAUTELADA`.

