import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, Lock, Radio } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/utils/auth/useAuth';
import { authFetch } from '@/utils/auth/getSession';
import { useState, useEffect } from 'react';

interface CountdownMap {
  [key: number]: string;
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { auth, signIn } = useAuth();
  const [countdown, setCountdown] = useState<CountdownMap>({});
  const [rsvpdEvents, setRsvpdEvents] = useState<Set<number>>(new Set());

  const {
    data: events,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await authFetch('/api/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
    enabled: !!auth,
  });

  // Countdown timer
  useEffect(() => {
    if (!events?.length) return;
    const tick = () => {
      const next: CountdownMap = {};
      events.forEach((ev: any) => {
        const diff = new Date(ev.start_time).getTime() - Date.now();
        if (diff <= 0) {
          next[ev.id] = 'LIVE NU 🔴';
        } else {
          const d = Math.floor(diff / 86400000);
          const h = Math.floor((diff % 86400000) / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          next[ev.id] =
            `${String(d).padStart(2, '0')}d : ${String(h).padStart(2, '0')}h : ${String(m).padStart(2, '0')}m : ${String(s).padStart(2, '0')}s`;
        }
      });
      setCountdown(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [events]);

  const handleRsvp = async (eventId: number) => {
    try {
      await authFetch('/api/rsvp', {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId }),
      });
      setRsvpdEvents((prev) => {
        const next = new Set(prev);
        if (next.has(eventId)) next.delete(eventId);
        else next.add(eventId);
        return next;
      });
      refetch();
    } catch (e) {
      console.error('RSVP failed', e);
    }
  };

  if (!auth) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#FAFAFA',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 40,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            backgroundColor: '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Calendar size={32} color="#D1D5DB" />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '900',
            color: '#111',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Exklusiva Events
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: '#9CA3AF',
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 28,
          }}
        >
          Bli member för att få tillgång till live-webbinarier och workshops.
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#111',
            height: 52,
            borderRadius: 16,
            paddingHorizontal: 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => signIn()}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            Logga in / Bli Medlem
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA', paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          borderBottomWidth: 1,
          borderColor: '#F0F0F0',
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: '#fff',
        }}
      >
        <Text style={{ fontWeight: '900', fontSize: 18, color: '#111' }}>Upcoming Events</Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2 }}>
          Live webbinarier & workshops
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color="#000" style={{ marginTop: 40 }} />
        ) : (
          events?.map((event: any) => {
            const isLive = countdown[event.id] === 'LIVE NU 🔴';
            const hasRsvpd = rsvpdEvents.has(event.id);
            const attendeeCount = Number(event.attendee_count ?? 0) + (hasRsvpd ? 1 : 0);

            return (
              <View
                key={event.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 24,
                  overflow: 'hidden',
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#F0F0F0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                }}
              >
                {/* Cover Banner */}
                <View
                  style={{
                    height: 160,
                    backgroundColor: isLive ? '#1A0000' : '#0F0A1E',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <Calendar size={56} color="rgba(255,255,255,0.08)" strokeWidth={1} />

                  {/* Live badge */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {isLive ? (
                      <View
                        style={{
                          backgroundColor: '#EF4444',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 20,
                        }}
                      >
                        <View
                          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }}
                        />
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
                          LIVE NU
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.12)',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 20,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
                          LIVE STREAM
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Attendee count */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Users size={12} color="rgba(255,255,255,0.6)" />
                    <Text
                      style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' }}
                    >
                      {attendeeCount} OSA:er
                    </Text>
                  </View>

                  {/* Countdown */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 30,
                    }}
                  >
                    <Text
                      style={{ color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 }}
                    >
                      {countdown[event.id] ?? '—'}
                    </Text>
                  </View>
                </View>

                {/* Content */}
                <View style={{ padding: 20 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '900',
                      color: '#6366F1',
                      marginBottom: 4,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {new Date(event.start_time).toLocaleDateString('sv-SE', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </Text>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: '900',
                      color: '#111',
                      marginBottom: 8,
                      lineHeight: 22,
                    }}
                  >
                    {event.title}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 19, marginBottom: 18 }}
                    numberOfLines={2}
                  >
                    {event.description}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        height: 46,
                        borderRadius: 14,
                        backgroundColor: hasRsvpd ? '#DCFCE7' : '#111',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => handleRsvp(event.id)}
                    >
                      <Text
                        style={{
                          fontWeight: '800',
                          fontSize: 13,
                          color: hasRsvpd ? '#16A34A' : '#fff',
                        }}
                      >
                        {hasRsvpd ? '✓ OSA Bekräftad' : 'OSA / Attending'}
                      </Text>
                    </TouchableOpacity>

                    {isLive && (
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          height: 46,
                          borderRadius: 14,
                          backgroundColor: '#EF4444',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Radio size={14} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                          Gå med Live
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
