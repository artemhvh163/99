import React, { useState, useMemo, useCallback } from 'react';
import TextInput from '@/components/StableTextInput';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Search, X, User, Car, Clock, ChevronRight,
} from 'lucide-react-native';
import { useColors } from '@/providers/ThemeProvider';
import { ThemeColors } from '@/constants/colors';
import { useParking } from '@/providers/ParkingProvider';
import { buildEntitySearchQuery, formatDateTime, getServiceTypeLabel, matchCarAndClient, matchClientWithCars } from '@/utils/helpers';

type ResultType = 'client' | 'car' | 'session';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  meta?: string;
  routeParams: { pathname: string; params?: Record<string, string> };
}

export default function GlobalSearchScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    activeClients, activeCars, sessions, activeSessions,
  } = useParking();

  const [query, setQuery] = useState('');

  const results = useMemo((): SearchResult[] => {
    if (query.length < 2) return [];
    const searchQuery = buildEntitySearchQuery(query);
    const items: SearchResult[] = [];
    const exactItems: SearchResult[] = [];

    activeClients.forEach(client => {
      const clientCars = activeCars.filter(c => c.clientId === client.id);
      const match = matchClientWithCars(client, clientCars, searchQuery);
      if (match.matches) {
        const entry: SearchResult = {
          id: `c-${client.id}`,
          type: 'client',
          title: client.name,
          subtitle: client.phone + (clientCars.length > 0 ? ` · ${clientCars.map(c => c.plateNumber).join(', ')}` : ''),
          routeParams: { pathname: '/client-card', params: { clientId: client.id } },
        };
        items.push(entry);
        if (match.exact) exactItems.push(entry);
      }
    });

    activeCars.forEach(car => {
      const client = activeClients.find(c => c.id === car.clientId);
      const match = matchCarAndClient(car, client, searchQuery);
      if (match.matches) {
        const isParked = activeSessions.some(s => s.carId === car.id);
        const entry: SearchResult = {
          id: `a-${car.id}`,
          type: 'car',
          title: car.plateNumber,
          subtitle: `${car.carModel ?? ''} · ${client?.name ?? 'Неизвестный'}`,
          meta: isParked ? 'На парковке' : undefined,
          routeParams: { pathname: '/client-card', params: { clientId: car.clientId } },
        };
        items.push(entry);
        if (match.exact) exactItems.push(entry);
      }
    });

    const matchedSessions = sessions.filter(s => {
      const car = activeCars.find(c => c.id === s.carId);
      const client = activeClients.find(c => c.id === s.clientId);
      return matchCarAndClient(car, client, searchQuery).matches;
    }).slice(0, 15);

    matchedSessions.forEach(s => {
      const car = activeCars.find(c => c.id === s.carId);
      const client = activeClients.find(c => c.id === s.clientId);
      const isActive = ['active', 'active_debt'].includes(s.status) && !s.cancelled;
      const match = matchCarAndClient(car, client, searchQuery);
      const entry: SearchResult = {
        id: `s-${s.id}`,
        type: 'session',
        title: `${car?.plateNumber ?? '???'} · ${getServiceTypeLabel(s.serviceType)}`,
        subtitle: `${client?.name ?? ''} · ${formatDateTime(s.entryTime)}`,
        meta: isActive ? 'Активная' : s.cancelled ? 'Отменена' : 'Завершена',
        routeParams: isActive
          ? { pathname: '/exit-modal', params: { sessionId: s.id } }
          : { pathname: '/client-card', params: { clientId: s.clientId } },
      };
      items.push(entry);
      if (match.exact) exactItems.push(entry);
    });

    return (exactItems.length > 0 ? exactItems : items).slice(0, 30);
  }, [query, activeClients, activeCars, sessions, activeSessions]);

  const getIcon = useCallback((type: ResultType) => {
    switch (type) {
      case 'client': return { Icon: User, color: colors.primary };
      case 'car': return { Icon: Car, color: colors.info };
      case 'session': return { Icon: Clock, color: colors.warning };
    }
  }, [colors.primary, colors.info, colors.warning]);

  const renderItem = useCallback(({ item }: { item: SearchResult }) => {
    const { Icon, color } = getIcon(item.type);
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => router.push(item.routeParams as never)}
        activeOpacity={0.7}
      >
        <View style={[styles.resultIcon, { backgroundColor: color + '15' }]}>
          <Icon size={18} color={color} />
        </View>
        <View style={styles.resultBody}>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.resultSub} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        {item.meta && (
          <View style={[styles.metaBadge, item.meta === 'На парковке' || item.meta === 'Активная' ? styles.metaActive : null]}>
            <Text style={[styles.metaText, item.meta === 'На парковке' || item.meta === 'Активная' ? styles.metaTextActive : null]}>
              {item.meta}
            </Text>
          </View>
        )}
        <ChevronRight size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  }, [getIcon, router, styles, colors.textTertiary]);

  const groupedResults = useMemo(() => {
    const clients = results.filter(r => r.type === 'client');
    const cars = results.filter(r => r.type === 'car');
    const sess = results.filter(r => r.type === 'session');
    const sections: { title: string; data: SearchResult[] }[] = [];
    if (clients.length > 0) sections.push({ title: 'Клиенты', data: clients });
    if (cars.length > 0) sections.push({ title: 'Автомобили', data: cars });
    if (sess.length > 0) sections.push({ title: 'Сессии', data: sess });
    return sections;
  }, [results]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Поиск', headerShown: true }} />

      <View style={styles.searchBox}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Клиент, номер авто, телефон..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {query.length < 2 ? (
        <View style={styles.placeholder}>
          <Search size={48} color={colors.textTertiary} />
          <Text style={styles.placeholderText}>Введите минимум 2 символа</Text>
          <Text style={styles.placeholderHint}>Поиск по клиентам, номерам авто и сессиям</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Ничего не найдено</Text>
        </View>
      ) : (
        <FlatList
          data={groupedResults.flatMap(s => [
            { id: `header-${s.title}`, isHeader: true as const, title: s.title } as const,
            ...s.data.map(d => ({ ...d, isHeader: false as const })),
          ])}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            if (item.isHeader) {
              return <Text style={styles.sectionHeader}>{item.title}</Text>;
            }
            return renderItem({ item: item as SearchResult });
          }}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 14, margin: 16, marginBottom: 0,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: {
    flex: 1, paddingVertical: 14, paddingLeft: 10,
    fontSize: 16, color: colors.text,
  },
  placeholder: { alignItems: 'center', paddingTop: 80, gap: 10 },
  placeholderText: { fontSize: 16, fontWeight: '600' as const, color: colors.textTertiary },
  placeholderHint: { fontSize: 13, color: colors.textTertiary },
  list: { padding: 16, paddingBottom: 32 },
  sectionHeader: {
    fontSize: 13, fontWeight: '600' as const, color: colors.textTertiary,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
    marginTop: 12, marginBottom: 6,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 10,
    padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.border,
  },
  resultIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  resultBody: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  resultSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  metaBadge: {
    backgroundColor: colors.surface, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginRight: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  metaActive: { backgroundColor: colors.primarySurface, borderColor: colors.primary + '30' },
  metaText: { fontSize: 11, fontWeight: '600' as const, color: colors.textTertiary },
  metaTextActive: { color: colors.primary },
});
