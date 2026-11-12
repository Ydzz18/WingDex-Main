export type NotificationKind = 'achievement' | 'collection' | 'following' | 'announcement';

export type InboxItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  unread: boolean;
};

export const initialNotifications: InboxItem[] = [
  {
    id: 'early-bird',
    kind: 'achievement',
    title: 'Early Bird badge unlocked',
    detail: 'Five sunrise outings. Well worth the alarm.',
    unread: true,
  },
  {
    id: 'collection',
    kind: 'collection',
    title: 'A new bird for your life list',
    detail: 'Your Northern Flicker sighting is ready to add.',
    unread: true,
  },
  {
    id: 'following',
    kind: 'following',
    title: 'Elise added a Varied Thrush',
    detail: 'A nearby woodland sighting from someone you follow.',
    unread: true,
  },
  {
    id: 'weekly',
    kind: 'collection',
    title: 'Your field week in review',
    detail: 'You logged 4 sightings across two new places.',
    unread: false,
  },
];
