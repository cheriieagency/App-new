import { Tabs } from 'expo-router';
import { Home, MessageSquare, Calendar, GraduationCap } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderColor: '#E5E7EB',
          paddingTop: 8,
          // Removed manual height for iOS compliance
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#6B6B6B',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Store',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <MessageSquare color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <Calendar color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="classroom"
        options={{
          title: 'Classroom',
          tabBarIcon: ({ color }) => <GraduationCap color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
