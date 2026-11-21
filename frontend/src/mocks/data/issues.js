export const ISSUE_STATUS = {
  PENDING: 'PENDING',
  VIEWED: 'VIEWED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
}

export const issues = [
  {
    id: 'issue-1',
    classId: 'class-ginf-2',
    title: 'Climatiseur en panne dans la salle B12',
    submittedAt: '2026-11-19T10:20:00',
    status: ISSUE_STATUS.IN_PROGRESS,
  },
  {
    id: 'issue-2',
    classId: 'class-ginf-2',
    title: 'Projecteur intermittent en amphithéâtre C',
    submittedAt: '2026-11-18T15:40:00',
    status: ISSUE_STATUS.VIEWED,
  },
  {
    id: 'issue-3',
    classId: 'class-ginf-2',
    title: 'Planning du rattrapage à confirmer',
    submittedAt: '2026-11-15T09:10:00',
    status: ISSUE_STATUS.RESOLVED,
  },
]
