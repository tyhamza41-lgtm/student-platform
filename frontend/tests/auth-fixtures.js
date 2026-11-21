import { USER_ROLES, REPRESENTATIVE_STATUS } from '../src/constants/roles'

export const users = {
  student: {
    id: 'student-1',
    name: 'Sam Student',
    email: 'sam@example.test',
    role: USER_ROLES.STUDENT,
  },
  representative: {
    id: 'representative-1',
    name: 'Riley Representative',
    email: 'riley@example.test',
    role: USER_ROLES.STUDENT,
    representativeStatus: REPRESENTATIVE_STATUS.ACTIVE,
  },
  association: {
    id: 'association-1',
    name: 'Campus Association',
    email: 'association@example.test',
    role: USER_ROLES.ASSOCIATION,
  },
  director: {
    id: 'director-1',
    name: 'Dana Director',
    email: 'director@example.test',
    role: USER_ROLES.DIRECTOR,
  },
}
