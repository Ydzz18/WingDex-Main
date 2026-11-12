import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  ChevronRight,
  CloudSun,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationKindIcon } from '../../src/components/NotificationKindIcon';
import { initialNotifications } from '../../src/data/notifications';
import { getPublishedAnnouncements, type AppAnnouncement } from '../../src/services/adminContent';
import { colors } from '../../src/theme';

type NotificationFilter = 'all' | 'unread' | 'following';
type PreferenceKey = 'fieldConditions' | 'collectionMilestones' | 'followingActivity';

type NotificationPreferences = Record<PreferenceKey, boolean>;

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [fieldUnread, setFieldUnread] = useState(true);
  const [items, setItems] = useState(initialNotifications);
  const [announcementError, setAnnouncementError] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    fieldConditions: true,
    collectionMilestones: true,
    followingActivity: false,
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    getPublishedAnnouncements()
      .then((announcements) => {
        if (!active) return;
        const publishedItems = announcements.map((announcement: AppAnnouncement) => ({
          id: `announcement-${announcement.id}`,
          kind: 'announcement' as const,
          title: announcement.title,
          detail: announcement.body,
          unread: true,
        }));
        setItems([...publishedItems, ...initialNotifications]);
        setAnnouncementError(false);
      })
      .catch(() => {
        if (active) setAnnouncementError(true);
      });
    return () => { active = false; };
  }, []));

  const unreadCount = items.filter((item) => item.unread).length + (fieldUnread ? 1 : 0);
  const filteredItems = useMemo(() => items.filter((item) => {
    if (filter === 'unread') return item.unread;
    if (filter === 'following') return item.kind === 'following';
    return true;
  }), [filter, items]);

  const markRead = (id: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, unread: false } : item));
  const markAllRead = () => {
    setFieldUnread(false);
    setItems((current) => current.map((item) => ({ ...item, unread: false })));
  };
  const closeSettings = () => {
    setSettingsVisible(false);
    setSystemNotice(null);
  };
  const togglePreference = (key: PreferenceKey) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft color={colors.ink} size={27} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Pressable
            onPress={() => setSettingsVisible(true)}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Notification settings"
          >
            <SlidersHorizontal color={colors.ink} size={25} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.filters} accessibilityRole="tablist" accessibilityLabel="Notification filters">
          {([
            ['all', 'All updates'],
            ['unread', `Unread · ${unreadCount}`],
            ['following', 'Following'],
          ] as const).map(([value, label]) => {
            const selected = filter === value;
            return <Pressable key={value} onPress={() => setFilter(value)} style={({ pressed }) => [styles.filter, selected && styles.filterSelected, pressed && styles.pressed]} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={label}>
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text>
            </Pressable>;
          })}
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateTitle}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Pressable onPress={markAllRead} disabled={unreadCount === 0} accessibilityRole="button" accessibilityLabel="Mark all notifications as read" style={({ pressed }) => [styles.markRead, unreadCount === 0 && styles.markReadDisabled, pressed && styles.pressed]}>
            <Text style={styles.markReadText}>{unreadCount ? 'Mark all as read' : 'All caught up'}</Text>
          </Pressable>
        </View>

        {announcementError && (
          <Text accessibilityRole="alert" style={styles.announcementError}>
            Wingdex announcements couldn’t be refreshed. Your local notifications are still available.
          </Text>
        )}

        {filter !== 'following' && (filter !== 'unread' || fieldUnread) && (
          <View style={styles.weatherCard}>
            <Pressable
              onPress={() => setFieldUnread(false)}
              style={({ pressed }) => [pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Field conditions. A good morning to head out."
            >
              <View style={styles.weatherMeta}>
                <View style={styles.warmIcon}><CloudSun color="#B17B2D" size={28} strokeWidth={2.1} /></View>
                <Text style={styles.weatherLabel}>FIELD CONDITIONS</Text>
                <Text style={styles.time}>8:30 AM</Text>
                {fieldUnread && <View style={styles.unreadDot} accessibilityLabel="Unread" />}
              </View>
              <Text style={styles.weatherTitle}>A good morning to head out</Text>
              <Text style={styles.weatherCopy}>Rain clears by 10 AM. Calm winds and 54°F make for excellent birding in Portland.</Text>
            </Pressable>
            <Pressable onPress={() => { setFieldUnread(false); Alert.alert('Local forecast', 'The detailed Portland forecast is on its way.'); }} style={({ pressed }) => [styles.forecastLink, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="View local forecast">
              <Text style={styles.forecastText}>View local forecast</Text><ArrowRight color="#256446" size={20} strokeWidth={2.6} />
            </Pressable>
          </View>
        )}

        <View style={styles.list}>
          {filteredItems.map((item) => (
            <Pressable key={item.id} onPress={() => markRead(item.id)} style={({ pressed }) => [styles.notificationCard, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.detail}. ${item.unread ? 'Unread.' : 'Read.'}`}>
              <View style={styles.warmIcon}><NotificationKindIcon kind={item.kind} /></View>
              <View style={styles.notificationCopy}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationDetail}>{item.detail}</Text>
              </View>
              {item.unread ? <View style={styles.cardUnreadDot} accessibilityLabel="Unread" /> : <ChevronRight color={colors.muted} size={27} strokeWidth={2.2} />}
            </Pressable>
          ))}
        </View>

        {filteredItems.length === 0 && (
          <View style={styles.emptyState} accessible accessibilityRole="text" accessibilityLabel="No notifications in this filter">
            <BellRing color={colors.inkSoft} size={30} />
            <Text style={styles.emptyTitle}>Nothing new here</Text>
            <Text style={styles.emptyCopy}>Try another filter, or come back after your next outing.</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={settingsVisible}
        onRequestClose={closeSettings}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeSettings}
            accessibilityRole="button"
            accessibilityLabel="Close notification settings"
          />
          <View
            style={styles.settingsSheet}
            accessible
            accessibilityLabel="Notification settings"
            accessibilityViewIsModal
          >
            <View style={styles.sheetHandle} />
            <View style={styles.settingsHeader}>
              <View style={styles.settingsHeadingCopy}>
                <Text style={styles.settingsTitle}>Notification settings</Text>
                <Text style={styles.settingsSubtitle}>Choose the field notes you want Wingdex to send your way.</Text>
              </View>
              <Pressable
                onPress={closeSettings}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Close notification settings"
              >
                <X color={colors.ink} size={22} strokeWidth={2.4} />
              </Pressable>
            </View>

            <View style={styles.preferenceList}>
              {([
                ['fieldConditions', 'Field conditions', 'Forecasts and good birding windows near you.'],
                ['collectionMilestones', 'Collection milestones', 'New life-list birds, badges, and weekly recaps.'],
                ['followingActivity', 'Following activity', 'Sightings and updates from people you follow.'],
              ] as const).map(([key, title, detail]) => (
                <View key={key} style={styles.preferenceRow}>
                  <View style={styles.preferenceCopy}>
                    <Text style={styles.preferenceTitle}>{title}</Text>
                    <Text style={styles.preferenceDetail}>{detail}</Text>
                  </View>
                  <Switch
                    value={preferences[key]}
                    onValueChange={() => togglePreference(key)}
                    trackColor={{ false: '#D6DED5', true: '#256446' }}
                    thumbColor={colors.white}
                    ios_backgroundColor="#D6DED5"
                    accessibilityLabel={`${title} notifications`}
                    accessibilityHint={preferences[key] ? 'Double tap to turn off' : 'Double tap to turn on'}
                  />
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => setSystemNotice('System notification controls are available in your device settings.')}
              style={({ pressed }) => [styles.systemAction, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Manage system notifications"
            >
              <Text style={styles.systemActionText}>Manage system notifications</Text>
              <ChevronRight color="#256446" size={21} strokeWidth={2.4} />
            </Pressable>
            {systemNotice && <Text style={styles.systemNotice} accessibilityRole="text">{systemNotice}</Text>}

            <Pressable
              onPress={closeSettings}
              style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Done saving notification preferences"
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 38 },
  header: { height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: colors.white },
  headerTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 27, fontWeight: '700' },
  filters: { flexDirection: 'row', gap: 12, marginTop: 18 },
  filter: { minHeight: 57, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, borderRadius: 29, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  filterSelected: { backgroundColor: '#256446', borderColor: '#256446' },
  filterText: { color: colors.ink, fontSize: 16, fontWeight: '500' },
  filterTextSelected: { color: colors.white },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 31, marginBottom: 15 },
  dateTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 20, fontWeight: '700' },
  announcementError: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: 12 },
  markRead: { minHeight: 36, justifyContent: 'center' }, markReadDisabled: { opacity: 0.55 },
  markReadText: { color: '#256446', fontSize: 14, fontWeight: '700' },
  weatherCard: { padding: 27, borderRadius: 35, borderWidth: 1, borderColor: '#C9DAC5', backgroundColor: colors.white },
  weatherMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warmIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#F4EBD9' },
  weatherLabel: { color: '#B17B2D', fontSize: 13, fontWeight: '600', flex: 1 },
  time: { color: colors.muted, fontSize: 14 }, unreadDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#256446' },
  weatherTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 27, lineHeight: 34, marginTop: 24 },
  weatherCopy: { color: colors.muted, fontSize: 19, lineHeight: 28, marginTop: 12 },
  forecastLink: { alignSelf: 'flex-start', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17 },
  forecastText: { color: '#256446', fontSize: 16, fontWeight: '700' },
  list: { gap: 14, marginTop: 16 },
  notificationCard: { minHeight: 131, flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 28, paddingVertical: 21, borderRadius: 34, backgroundColor: colors.white },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationTitle: { color: colors.ink, fontSize: 20, lineHeight: 26, fontWeight: '500' },
  notificationDetail: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 5 },
  cardUnreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#256446' },
  emptyState: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 52, marginTop: 16, borderRadius: 30, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  emptyTitle: { color: colors.ink, fontSize: 19, fontWeight: '700', marginTop: 14 },
  emptyCopy: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6, textAlign: 'center' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(16, 35, 28, 0.58)' },
  settingsSheet: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, borderTopLeftRadius: 36, borderTopRightRadius: 36, backgroundColor: colors.paper },
  sheetHandle: { width: 42, height: 5, alignSelf: 'center', borderRadius: 3, backgroundColor: '#B8C4B7' },
  settingsHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, marginTop: 22 },
  settingsHeadingCopy: { flex: 1 },
  settingsTitle: { color: '#256446', fontFamily: 'Georgia', fontSize: 26, lineHeight: 32, fontWeight: '700' },
  settingsSubtitle: { color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 7 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.white },
  preferenceList: { marginTop: 24, borderTopWidth: 1, borderColor: colors.line },
  preferenceRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.line },
  preferenceCopy: { flex: 1, minWidth: 0 },
  preferenceTitle: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  preferenceDetail: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  systemAction: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 2 },
  systemActionText: { color: '#256446', fontSize: 15, fontWeight: '700' },
  systemNotice: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  doneButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 20, borderRadius: 17, backgroundColor: '#256446' },
  doneButtonPressed: { backgroundColor: '#1D5038' },
  doneButtonText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
