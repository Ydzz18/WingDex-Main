import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import { colors } from '../theme';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  accessory?: ReactNode;
};

type PageHeaderActionProps = Omit<PressableProps, 'style'>;

export function PageHeader({ title, subtitle, eyebrow, accessory }: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </View>
  );
}

export function PageHeaderAction({ children, ...props }: PageHeaderActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: colors.inkSoft,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 31,
    lineHeight: 36,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  accessory: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  action: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionPressed: { opacity: 0.72 },
});
