# Student Platform frontend

The client uses React, Vite, and a frontend-only mock data store. From this
directory, run `npm run dev`, `npm test -- --run`, `npm run lint`, or
`npm run build`.

## Mock data

`src/mocks/seedData.js` is the canonical, read-only seed dataset. Existing
imports from `src/mocks/data/` remain available for the current dashboard; new
feature pages should use the async services under `src/features/` rather than
mutating those seed exports.

The mock repository stores a versioned database in localStorage under
`student-platform.mock-database.v1`. The first service read initializes the
predictable seed. Service methods return promises and cloned records; lookup
methods return `null` for unknown IDs, while invalid mutations reject with a
`MockDataError` whose `code` identifies the failure.

To restore the seed during development or tests:

```js
import { resetMockDatabase } from './mocks/mockDatabase'

await resetMockDatabase()
```

Services accept the acting user ID for operations that enforce ownership or
role permissions. Authentication remains the existing in-memory mock context;
the mock database does not implement login or connect to a backend.
