import { REPRESENTATIVE_STATUS, USER_ROLES } from '../constants/roles.js'

export const ISSUE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  VIEWED: 'VIEWED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
})

export const REACTION_TYPES = Object.freeze({
  LIKE: 'LIKE',
  DISLIKE: 'DISLIKE',
})

export const EVENT_STATUS = Object.freeze({
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
})

export const NOTIFICATION_TYPES = Object.freeze({
  EVENT_DELETED: 'EVENT_DELETED',
  ISSUE_DELETED: 'ISSUE_DELETED',
})

const image = (photoId) => (
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=160&q=80`
)

const data = {
  users: [
    {
      id: 'student-1',
      name: 'Sam Student',
      email: 'sam@studentplatform.ma',
      role: USER_ROLES.STUDENT,
      classId: 'class-ginf-2',
      isActive: true,
      avatarUrl: image('photo-1500648767791-00dcc994a43e'),
    },
    {
      id: 'student-2',
      name: 'Hamza Tya',
      email: 'hamza@studentplatform.ma',
      role: USER_ROLES.STUDENT,
      classId: 'class-ginf-2',
      isActive: true,
      avatarUrl: image('photo-1500648767791-00dcc994a43e'),
    },
    {
      id: 'representative-1',
      name: 'Omar Benali',
      email: 'omar.rep@studentplatform.ma',
      role: USER_ROLES.STUDENT,
      classId: 'class-ginf-2',
      isActive: true,
      isRepresentative: true,
      representativeStatus: REPRESENTATIVE_STATUS.ACTIVE,
      designation: 'REPRESENTATIVE',
      avatarUrl: image('photo-1506794778202-cad84cf45f1d'),
    },
    {
      id: 'student-3',
      name: 'Sara Amrani',
      email: 'sara.amrani@studentplatform.ma',
      role: USER_ROLES.STUDENT,
      classId: 'class-ginf-2',
      isActive: true,
      avatarUrl: image('photo-1494790108377-be9c29b29330'),
    },
    {
      id: 'student-4',
      name: 'Youssef El Fassi',
      email: 'youssef.elfassi@studentplatform.ma',
      role: USER_ROLES.STUDENT,
      classId: 'class-ginf-2',
      isActive: true,
      avatarUrl: image('photo-1500648767791-00dcc994a43e'),
    },
    {
      id: 'student-5',
      name: 'Lina Bennis',
      email: 'lina.bennis@studentplatform.ma',
      role: USER_ROLES.STUDENT,
      classId: 'class-ginf-2',
      isActive: true,
      avatarUrl: image('photo-1544005313-94ddf0286df2'),
    },
    {
      id: 'student-6',
      name: 'Mehdi Tahiri',
      email: 'mehdi.tahiri@studentplatform.ma',
      role: USER_ROLES.STUDENT,
      classId: 'class-ginf-2',
      isActive: true,
      avatarUrl: image('photo-1506794778202-cad84cf45f1d'),
    },
    {
      id: 'association-2',
      name: 'Club Innovation & Technologies',
      email: 'innovation@studentplatform.ma',
      role: USER_ROLES.ASSOCIATION,
      associationId: 'association-2',
      isActive: true,
      avatarUrl: image('photo-1519389950473-47ba0277781c'),
    },
    {
      id: 'director-1',
      name: 'Dr. Nadia Alaoui',
      email: 'direction@studentplatform.ma',
      role: USER_ROLES.DIRECTOR,
      isActive: true,
      avatarUrl: image('photo-1573496359142-b8d87734a5a2'),
    },
    {
      id: 'association-1',
      name: 'Bureau des Arts',
      email: 'arts@studentplatform.ma',
      role: USER_ROLES.ASSOCIATION,
      associationId: 'association-1',
      isActive: true,
      avatarUrl: image('photo-1529156069898-49953e39b3ac'),
    },
  ],
  classes: [
    {
      id: 'class-ginf-2',
      name: 'GINF 2 — Génie Informatique',
      institution: 'ENSA Marrakech',
      studentIds: ['student-1', 'student-2', 'representative-1', 'student-3', 'student-4', 'student-5', 'student-6'],
      representativeId: 'representative-1',
      activeRepresentativeIds: ['representative-1'],
    },
  ],
  associations: [
    {
      id: 'association-1',
      accountUserId: 'association-1',
      name: 'Bureau des Arts',
      description: 'Association étudiante dédiée aux arts, à la photographie et aux événements culturels.',
      institution: 'ENSA Marrakech',
      isActive: true,
      avatarUrl: image('photo-1529156069898-49953e39b3ac'),
    },
    {
      id: 'association-2',
      accountUserId: 'association-2',
      name: 'Club Innovation & Technologies',
      description: 'Club étudiant consacré à l’innovation, au numérique et aux projets durables.',
      institution: 'ENSA Marrakech',
      isActive: true,
      avatarUrl: image('photo-1519389950473-47ba0277781c'),
    },
  ],
  posts: [
    {
      id: 'post-1',
      authorId: 'representative-1',
      authorName: 'Omar Benali',
      authorRole: 'Class Representative',
      authorAvatar: image('photo-1506794778202-cad84cf45f1d'),
      classId: 'class-ginf-2',
      publishedAt: '2026-11-20T09:30:00',
      content: 'Rappel important : le cours de programmation distribuée aura lieu en salle B12 demain matin à 8h30. Pensez à consulter le nouveau support partagé.',
      imageUrl: null,
      likeCount: 24,
      dislikeCount: 1,
      status: EVENT_STATUS.PUBLISHED,
    },
    {
      id: 'post-2',
      authorId: 'association-1',
      authorName: 'Bureau des Arts',
      authorRole: 'Student Association',
      authorAvatar: image('photo-1529156069898-49953e39b3ac'),
      associationId: 'association-1',
      publishedAt: '2026-11-19T14:15:00',
      content: 'Les inscriptions sont ouvertes pour le concours photographie du campus. Thème de cette année : « Marrakech, entre héritage et innovation ».',
      imageUrl: 'https://www.oujdacity.net/data/uploads/ofppt_ofppt.png',
      likeCount: 38,
      dislikeCount: 2,
      status: EVENT_STATUS.PUBLISHED,
    },
    {
      id: 'post-3',
      authorId: 'director-1',
      authorName: 'Dr. Nadia Alaoui',
      authorRole: 'Director',
      authorAvatar: image('photo-1573496359142-b8d87734a5a2'),
      publishedAt: '2026-11-18T11:00:00',
      content: 'L’amphithéâtre accueillera vendredi la conférence « IA responsable et métiers du numérique ». Toutes les filières sont invitées à participer.',
      imageUrl: null,
      likeCount: 52,
      dislikeCount: 3,
      status: 'PUBLISHED',
    },
    {
      id: 'post-4',
      authorId: 'student-1',
      authorName: 'Sam Student',
      authorRole: 'Student',
      authorAvatar: image('photo-1494790108377-be9c29b29330'),
      classId: 'class-ginf-2',
      publishedAt: '2026-11-17T16:45:00',
      content: 'Merci à tous ceux qui ont participé à la séance de révision collective. J’ai ajouté les corrections du TD dans l’espace de classe.',
      imageUrl: null,
      likeCount: 19,
      dislikeCount: 0,
      status: 'PUBLISHED',
    },
  ],
  comments: [
    { id: 'comment-1', postId: 'post-1', authorId: 'student-3', authorName: 'Sara Amrani', content: 'Merci pour le rappel, Omar !', createdAt: '2026-11-20T10:00:00' },
    { id: 'comment-2', postId: 'post-1', authorId: 'student-4', authorName: 'Youssef El Fassi', content: 'Le support est bien disponible sur la plateforme.', createdAt: '2026-11-20T10:15:00' },
    { id: 'comment-3', postId: 'post-2', authorId: 'student-5', authorName: 'Lina Bennis', content: 'J’ai déjà envoyé ma première photographie.', createdAt: '2026-11-19T16:00:00' },
    { id: 'comment-4', postId: 'post-3', authorId: 'student-6', authorName: 'Mehdi Tahiri', content: 'Événement très attendu. Merci pour cette initiative.', createdAt: '2026-11-18T12:00:00' },
  ],
  reactions: [
    { id: 'reaction-1', postId: 'post-1', userId: 'student-2', type: REACTION_TYPES.LIKE, createdAt: '2026-11-20T10:05:00' },
    { id: 'reaction-2', postId: 'post-2', userId: 'student-3', type: REACTION_TYPES.DISLIKE, createdAt: '2026-11-19T15:00:00' },
    { id: 'reaction-3', postId: 'post-3', userId: 'representative-1', type: REACTION_TYPES.LIKE, createdAt: '2026-11-18T12:30:00' },
  ],
  events: [
    {
      id: 'event-1',
      title: 'Conférence IA responsable',
      organizer: 'Direction ENSA Marrakech',
      ownerType: USER_ROLES.DIRECTOR,
      ownerId: 'director-1',
      date: '2026-11-27T14:00:00',
      location: 'Amphithéâtre A',
      description: 'Échanges autour des usages responsables de l’intelligence artificielle dans les métiers du numérique.',
      participantCount: 48,
      participantAvatarIds: ['student-2', 'representative-1'],
      status: 'PUBLISHED',
    },
    {
      id: 'event-2',
      title: 'Hackathon Green Campus',
      organizer: 'Club Innovation & Technologies',
      ownerType: USER_ROLES.ASSOCIATION,
      ownerId: 'association-2',
      date: '2026-12-03T09:00:00',
      location: 'FabLab ENSA',
      description: 'Une journée pour imaginer des solutions numériques au service de la transition écologique du campus.',
      participantCount: 32,
      participantAvatarIds: ['representative-1', 'student-2', 'student-1'],
      status: 'PUBLISHED',
    },
  ],
  registrations: [
    { id: 'registration-1', eventId: 'event-1', userId: 'student-2', phone: '+212 6 10 20 30 40', message: '', registeredAt: '2026-11-21T09:00:00' },
    { id: 'registration-2', eventId: 'event-2', userId: 'student-1', phone: '+212 6 11 22 33 44', message: 'Je participerai au prototypage.', registeredAt: '2026-11-21T11:30:00' },
  ],
  issues: [
    {
      id: 'issue-1',
      classId: 'class-ginf-2',
      submittedById: 'representative-1',
      title: 'Climatiseur en panne dans la salle B12',
      description: 'La salle est difficilement utilisable pendant les cours de l’après-midi.',
      submittedAt: '2026-11-19T10:20:00',
      status: ISSUE_STATUS.IN_PROGRESS,
    },
    {
      id: 'issue-2',
      classId: 'class-ginf-2',
      submittedById: 'representative-1',
      title: 'Projecteur intermittent en amphithéâtre C',
      description: 'Le projecteur s’éteint plusieurs fois pendant les présentations.',
      submittedAt: '2026-11-18T15:40:00',
      status: ISSUE_STATUS.VIEWED,
      viewedAt: '2026-11-18T16:00:00',
      viewedById: 'director-1',
    },
    {
      id: 'issue-3',
      classId: 'class-ginf-2',
      submittedById: 'representative-1',
      title: 'Planning du rattrapage à confirmer',
      description: 'La classe attend la confirmation de la date du rattrapage.',
      submittedAt: '2026-11-15T09:10:00',
      status: ISSUE_STATUS.RESOLVED,
    },
  ],
  notifications: [],
  idCounters: {},
}

function freezeRecursively(value) {
  Object.freeze(value)
  Object.values(value).forEach((item) => {
    if (item && typeof item === 'object' && !Object.isFrozen(item)) {
      freezeRecursively(item)
    }
  })
  return value
}

export const seedData = freezeRecursively(data)
