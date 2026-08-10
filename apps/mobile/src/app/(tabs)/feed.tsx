import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageSquare, Send, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/utils/auth/useAuth';
import { authFetch } from '@/utils/auth/getSession';
import { useState } from 'react';
import KeyboardAvoidingAnimatedView from '@/components/KeyboardAvoidingAnimatedView';

const LEVEL_BADGE = ['NOVICE', 'INSIDER', 'VIP', 'ELITE'];
const LEVEL_COLORS = ['#6B7280', '#3B82F6', '#8B5CF6', '#F59E0B'];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { auth, signIn } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  const user = auth?.user;

  const { data: feed, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const res = await authFetch('/api/feed');
      if (!res.ok) throw new Error('Failed to fetch feed');
      return res.json();
    },
    enabled: !!auth,
  });

  const createPost = useMutation({
    mutationFn: async (text: string) => {
      const res = await authFetch('/api/feed', {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setContent('');
    },
  });

  const likePost = useMutation({
    mutationFn: async (postId: number) => {
      const res = await authFetch('/api/likes', {
        method: 'POST',
        body: JSON.stringify({ post_id: postId }),
      });
      return res.json();
    },
    onMutate: (postId) => {
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (next.has(postId)) next.delete(postId);
        else next.add(postId);
        return next;
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });

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
          Members Only
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
          Gå med i clikd: Community för att delta i diskussioner och ta del av exklusivt
          innehåll.
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
    <KeyboardAvoidingAnimatedView
      style={{ flex: 1, backgroundColor: '#FAFAFA' }}
      behavior="padding"
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View
          style={{
            height: 56,
            borderBottomWidth: 1,
            borderColor: '#F0F0F0',
            justifyContent: 'center',
            paddingHorizontal: 20,
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ fontWeight: '900', fontSize: 18, color: '#111' }}>Community Feed</Text>
          <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>
            clikd: Members
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Create Post */}
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#F0F0F0',
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontWeight: '900', color: '#3B82F6', fontSize: 14 }}>
                  {user?.name?.[0] ?? '?'}
                </Text>
              </View>
              <TextInput
                placeholder="Dela något med communityn... 🇸🇪"
                placeholderTextColor="#C4C4C4"
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: '#374151',
                  minHeight: 72,
                  textAlignVertical: 'top',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 14,
                  padding: 12,
                  lineHeight: 20,
                }}
                multiline
                value={content}
                onChangeText={setContent}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#111',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  opacity: !content.trim() || createPost.isPending ? 0.5 : 1,
                }}
                onPress={() => createPost.mutate(content)}
                disabled={!content.trim() || createPost.isPending}
              >
                <Send size={13} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                  {createPost.isPending ? 'Publicerar...' : 'Publicera'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Posts */}
          {isLoading ? (
            <ActivityIndicator color="#000" style={{ marginTop: 20 }} />
          ) : (
            feed?.map((post: any, idx: number) => {
              const level = Math.min(idx % 4, LEVEL_BADGE.length - 1);
              const isLiked = likedPosts.has(post.id);

              return (
                <View
                  key={post.id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#F0F0F0',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: '#F3F4F6',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontWeight: '900', fontSize: 16 }}>
                        {post.user_name?.[0] ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontWeight: '800', fontSize: 14, color: '#111' }}>
                          {post.user_name}
                        </Text>
                        <View
                          style={{
                            backgroundColor: LEVEL_COLORS[level] + '20',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{ fontSize: 9, fontWeight: '900', color: LEVEL_COLORS[level] }}
                          >
                            {LEVEL_BADGE[level]}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{ fontSize: 10, color: '#C4C4C4', fontWeight: '600', marginTop: 1 }}
                      >
                        Nyligen
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{ fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 14 }}
                  >
                    {post.content}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 20,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: '#F9FAFB',
                    }}
                  >
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                      onPress={() => likePost.mutate(post.id)}
                    >
                      <Heart
                        size={15}
                        color={isLiked ? '#EF4444' : '#C4C4C4'}
                        fill={isLiked ? '#EF4444' : 'transparent'}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: isLiked ? '#EF4444' : '#C4C4C4',
                          fontWeight: '700',
                        }}
                      >
                        {Number(post.like_count) + (isLiked ? 1 : 0)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                    >
                      <MessageSquare size={15} color="#C4C4C4" />
                      <Text style={{ fontSize: 12, color: '#C4C4C4', fontWeight: '700' }}>
                        {post.comment_count}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
