import { Award, BellRing, Sprout, UsersRound } from 'lucide-react-native';
import type { NotificationKind } from '../data/notifications';

type Props = {
  kind: NotificationKind;
  size?: number;
};

export function NotificationKindIcon({ kind, size = 28 }: Props) {
  const common = { color: '#B17B2D', size, strokeWidth: 2.1 };
  if (kind === 'achievement') return <Award {...common} />;
  if (kind === 'following') return <UsersRound {...common} />;
  if (kind === 'announcement') return <BellRing {...common} />;
  return <Sprout {...common} />;
}
