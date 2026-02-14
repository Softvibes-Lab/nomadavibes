import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? "map" : "map-outline"} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    ...SHADOWS.medium,
  },
  tabBarLabel: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },
  activeIconContainer: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 2,
  },
});
