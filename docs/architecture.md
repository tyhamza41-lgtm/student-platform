# Architecture

## Vue d'ensemble

Le dépôt sépare le frontend, le backend, la documentation, l'infrastructure et les tests.
Les choix de frameworks et les responsabilités détaillées restent à préciser.

## Composants

- `frontend/` : application cliente.
- `backend/` : logique serveur et accès aux données.
- `backend/prisma/` : schéma et migrations de la base de données.
- `infrastructure/` : ressources de conteneurisation et de déploiement.
- `tests/` : tests d'intégration et tests end-to-end.

## Flux et déploiement

À compléter lorsque les technologies et les environnements cibles seront définis.

## Frontend mock moderation notifications

The frontend mock database stores notifications in its `notifications` collection. Director
moderation services create one recipient-scoped record per account in the same transaction
that removes the moderated record. Event deletion also removes the event's registrations in
that transaction. A failed operation therefore cannot leave a deletion notice behind.

The Topbar reads notifications through `features/notifications/notifications.service.js`;
recipient checks are enforced by the service for listing and read updates. Notifications
retain the deleted title, Director name, message, and deletion timestamp as snapshots, so
they remain readable after deletion. Existing version 1 localStorage data is migrated to
version 2 without dropping its collections.

The Class Issues routes are still placeholders. When implementing their UI, require a
confirmation step before invoking `features/issues/issues.service.js`'s `deleteIssue`
method. That existing Director-only service method owns the atomic deletion and broadcast
notification behavior; the UI must not create notifications independently or alter the
issue model for this integration.
