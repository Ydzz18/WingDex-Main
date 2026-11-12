import { Tabs } from 'expo-router';
import { BookOpenText, MapPin, ScanLine, Trophy, Bookmark } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#192F27',
        tabBarInactiveTintColor: '#748078',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          height: 80,
          paddingBottom: 12,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <BookOpenText color={focused ? '#192F27' : color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <MapPin color={focused ? '#192F27' : color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.scanIconContainerActive]}>
              <ScanLine color={focused ? '#FFFFFF' : color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Bookmark color={focused ? '#192F27' : color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="ranks"
        options={{
          title: 'Ranks',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Trophy color={focused ? '#192F27' : color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="user_profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="birds"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="bird_profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="share_collection"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#dfe7df',
  },
  scanIconContainerActive: {
    backgroundColor: '#192F27',
  },
});
