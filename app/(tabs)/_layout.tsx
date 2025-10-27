import React, { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

const API_BASE = 'https://apiantonioasistencias.onrender.com';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) { setRole(null); setLoading(false); return; }
        const t = await user.getIdToken();
        const res = await fetch(`${API_BASE}/usuarios/${user.uid}`, { headers: { Authorization: `Bearer ${t}` } });
        if (!res.ok) throw new Error('rol');
        const me = await res.json();
        setRole(me?.rol || null);
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Tabs screenOptions={{ tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint, headerShown: useClientOnlyValue(false, true) }}>
        <Tabs.Screen name="index" options={{ href: null }} />
      </Tabs>
    );
  }

  const isAdmin = role === 'admin';
  const isGuardia = role === 'guardia';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#000',
        headerShown: useClientOnlyValue(false, true),
        headerRight: () => (
          <Pressable
            onPress={async () => { try { await signOut(auth); router.replace('/login'); } catch {} }}
            style={{ marginRight: 12 }}
          >
            {({ pressed }) => (
              <FontAwesome
                name="sign-out"
                size={22}
                color="#000"
                style={{ opacity: pressed ? 0.5 : 1 }}
              />
            )}
          </Pressable>
        ),
      }}>
      <Tabs.Screen 
        name="usuarios" 
        options={{ 
          title: 'Usuarios',
          href: isAdmin ? '/usuarios' : null,
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />
        }} 
      />
      <Tabs.Screen 
        name="turnos" 
        options={{ 
          title: 'Turnos',
          href: isAdmin ? '/turnos' : null,
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />
        }} 
      />
      <Tabs.Screen 
        name="asistencias" 
        options={{ 
          title: 'Asistencias',
          href: isAdmin ? '/asistencias' : null,
          tabBarIcon: ({ color }) => <TabBarIcon name="check-circle" color={color} />
        }} 
      />
      <Tabs.Screen 
        name="mis-turnos" 
        options={{ 
          title: 'Mis turnos',
          href: isGuardia ? '/mis-turnos' : null,
          tabBarIcon: ({ color }) => <TabBarIcon name="list-ul" color={color} />
        }} 
      />
    </Tabs>
  );
}
