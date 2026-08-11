import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, Video, Star, ChevronRight, Lock, Shield } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/utils/auth/useAuth';
import { useState } from 'react';
import { router } from 'expo-router';

const PRODUCT_ICONS: Record<string, React.ElementType> = {
  ebook: BookOpen,
  subscription: Users,
  course: Video,
  coaching: Star,
};

const PRODUCT_COLORS: Record<string, string> = {
  ebook: '#10B981',
  subscription: '#3B82F6',
  course: '#8B5CF6',
  coaching: '#F59E0B',
};

const PRODUCT_BG: Record<string, string> = {
  ebook: '#ECFDF5',
  subscription: '#EFF6FF',
  course: '#F5F3FF',
  coaching: '#FFFBEB',
};

export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const { auth, signIn } = useAuth();
  const [checkoutProduct, setCheckoutProduct] = useState<any>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });

  const PRICE_LABELS: Record<string, string> = {
    ebook: 'GRATIS',
    subscription: '199 SEK/mån',
    course: '149 SEK',
    coaching: '599 SEK',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA', paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Creator Profile */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ position: 'relative', marginBottom: 16 }}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
              }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
              contentFit="cover"
            />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: '#3B82F6',
                borderWidth: 2,
                borderColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
            </View>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#111', marginBottom: 2 }}>
            Sofia Bergström
          </Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', fontWeight: '600', marginBottom: 10 }}>
            @sofiabergstrom
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: 20,
              maxWidth: 280,
            }}
          >
            Hjälper nordiska kreatörer skala sin digitala närvaro och bygga passiv inkomst. 🇸🇪✨
          </Text>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 18 }}>
            {[
              { label: 'Följare', value: '48.2K' },
              { label: 'Members', value: '1,340' },
              { label: 'Kurser', value: '12' },
            ].map((s) => (
              <View key={s.label} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#111' }}>{s.value}</Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Social Links */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          {['instagram', 'tiktok', 'youtube'].map((platform) => (
            <View
              key={platform}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: '#F4F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16 }}>
                {platform === 'instagram' ? '📸' : platform === 'tiktok' ? '🎵' : '▶️'}
              </Text>
            </View>
          ))}
        </View>

        {/* Member Portal Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#111',
            height: 52,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
          }}
          onPress={() => {
            if (auth) {
              (router as any).push('/feed');
            } else {
              signIn();
            }
          }}
        >
          <Lock size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            {auth ? 'Gå till Memberportal' : 'Logga in som Medlem'}
          </Text>
          <ChevronRight size={15} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '900',
              color: '#9CA3AF',
              marginHorizontal: 12,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Produkter
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
        </View>

        {/* Product Stack */}
        <View style={{ gap: 12 }}>
          {isLoading ? (
            <ActivityIndicator color="#000" style={{ marginTop: 20 }} />
          ) : (
            products?.map((product: any) => {
              const Icon = PRODUCT_ICONS[product.type] ?? BookOpen;
              const color = PRODUCT_COLORS[product.type] ?? '#000';
              const bg = PRODUCT_BG[product.type] ?? '#F4F4F6';
              const priceLabel = PRICE_LABELS[product.type] ?? `${Math.round(product.price)} SEK`;

              return (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => setCheckoutProduct(product)}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#F0F0F0',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                  }}
                >
                  <View
                    style={{
                      width: 68,
                      height: 68,
                      backgroundColor: bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      alignSelf: 'stretch',
                    }}
                  >
                    <Icon size={24} color={color} />
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: '800', color: '#111', marginBottom: 2 }}
                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 16 }}
                      numberOfLines={2}
                    >
                      {product.description}
                    </Text>
                  </View>
                  <View style={{ paddingRight: 14, alignItems: 'flex-end', gap: 4 }}>
                    <View
                      style={{
                        backgroundColor: color,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
                        {priceLabel}
                      </Text>
                    </View>
                    <ChevronRight size={14} color="#D1D5DB" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Trust */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 16,
            marginTop: 32,
            paddingTop: 24,
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
          }}
        >
          {['Payments Verified', 'SSL Säkrad'].map((badge) => (
            <View key={badge} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Shield size={11} color="#9CA3AF" />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF' }}>{badge}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
