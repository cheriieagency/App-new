import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { PlayCircle, CheckCircle2, Lock, Download } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/utils/auth/useAuth';
import { authFetch } from '@/utils/auth/getSession';
import { useState } from 'react';

export default function ClassroomScreen() {
  const insets = useSafeAreaInsets();
  const { auth, signIn } = useAuth();
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());

  const { data: classroom, isLoading } = useQuery({
    queryKey: ['classroom'],
    queryFn: async () => {
      const res = await authFetch('/api/classroom');
      if (!res.ok) throw new Error('Failed to fetch classroom');
      const data = await res.json();
      if (data?.length && !activeCourseId) {
        setActiveCourseId(data[0].id);
        if (data[0].lessons?.length) setActiveLessonId(data[0].lessons[0].id);
      }
      return data;
    },
    enabled: !!auth,
  });

  const activeCourse = classroom?.find((c: any) => c.id === activeCourseId) ?? classroom?.[0];
  const activeLesson =
    activeCourse?.lessons?.find((l: any) => l.id === activeLessonId) ?? activeCourse?.lessons?.[0];
  const progress = activeCourse
    ? Math.round((completedLessons.size / Math.max(activeCourse.lessons?.length ?? 1, 1)) * 100)
    : 0;

  const toggleLesson = (id: number) => {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          <Lock size={32} color="#D1D5DB" />
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
          Members Only Classroom
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
          Få tillgång till alla kurser och lektioner med ett member-abonnemang.
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
        <Text style={{ fontWeight: '900', fontSize: 18, color: '#111' }}>Classroom</Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2 }}>
          Nordic Creator Masterclass
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color="#000" style={{ marginTop: 40 }} />
        ) : !activeCourse ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Inga kurser tillgängliga</Text>
          </View>
        ) : (
          <>
            {/* Video Player */}
            <View style={{ backgroundColor: '#000', aspectRatio: 16 / 9 }}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <PlayCircle size={64} color="rgba(255,255,255,0.3)" strokeWidth={1} />
                {activeLesson && (
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: 13,
                      fontWeight: '700',
                      marginTop: 12,
                      textAlign: 'center',
                      paddingHorizontal: 20,
                    }}
                  >
                    {activeLesson.title}
                  </Text>
                )}
              </View>
            </View>

            {/* Course info + progress */}
            <View style={{ backgroundColor: '#fff', padding: 20, marginBottom: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 12,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '900',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 2,
                    }}
                  >
                    Nuvarande lektion
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#111', lineHeight: 20 }}>
                    {activeLesson?.title ?? 'Välj en lektion'}
                  </Text>
                </View>
                {activeLesson && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: completedLessons.has(activeLesson.id)
                        ? '#DCFCE7'
                        : '#F3F4F6',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onPress={() => toggleLesson(activeLesson.id)}
                  >
                    <CheckCircle2
                      size={14}
                      color={completedLessons.has(activeLesson.id) ? '#16A34A' : '#9CA3AF'}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: completedLessons.has(activeLesson.id) ? '#16A34A' : '#9CA3AF',
                      }}
                    >
                      {completedLessons.has(activeLesson.id) ? 'Klar' : 'Markera klar'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Progress bar */}
              <View style={{ marginBottom: 8 }}>
                <View
                  style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '900',
                      color: '#C4C4C4',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Framsteg
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#3B82F6' }}>
                    {progress}% klart
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      backgroundColor: '#3B82F6',
                      width: `${progress}%`,
                      borderRadius: 3,
                    }}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
              >
                <Download size={13} color="#9CA3AF" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#9CA3AF' }}>PDF Guide</Text>
              </TouchableOpacity>
            </View>

            {/* Course Switcher */}
            {classroom?.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 8 }}
              >
                {classroom.map((c: any) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      setActiveCourseId(c.id);
                      setActiveLessonId(c.lessons?.[0]?.id ?? null);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: activeCourseId === c.id ? '#111' : '#fff',
                      borderWidth: 1,
                      borderColor: activeCourseId === c.id ? '#111' : '#E5E7EB',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: activeCourseId === c.id ? '#fff' : '#6B7280',
                      }}
                    >
                      {c.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Lesson List */}
            <View style={{ backgroundColor: '#fff', marginHorizontal: 0 }}>
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0F0F0',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '900',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {activeCourse.lessons?.length} Lektioner · {activeCourse.title}
                </Text>
              </View>
              {activeCourse.lessons?.map((lesson: any, idx: number) => {
                const isDone = completedLessons.has(lesson.id);
                const isActive = activeLesson?.id === lesson.id;

                return (
                  <Pressable
                    key={lesson.id}
                    onPress={() => setActiveLessonId(lesson.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F9FAFB',
                      backgroundColor: isActive ? '#EFF6FF' : '#fff',
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDone ? '#DCFCE7' : isActive ? '#DBEAFE' : '#F3F4F6',
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2 size={16} color="#16A34A" />
                      ) : (
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '900',
                            color: isActive ? '#3B82F6' : '#9CA3AF',
                          }}
                        >
                          {idx + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: isDone || isActive ? '800' : '600',
                        color: isActive ? '#1D4ED8' : isDone ? '#15803D' : '#374151',
                      }}
                      numberOfLines={2}
                    >
                      {lesson.title}
                    </Text>
                    {isActive && (
                      <View
                        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
