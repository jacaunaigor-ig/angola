import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { THEME } from './src/theme/theme';
import TacticalMapScreen from './src/screens/TacticalMapScreen';
import ActivistDoorToDoorScreen from './src/screens/ActivistDoorToDoorScreen';
import ElectionDayScreen from './src/screens/ElectionDayScreen';
import { offlineStorage } from './src/services/offlineStorage';

export default function App() {
  const [tabAtiva, setTabAtiva] = useState('MAPA'); // 'MAPA' | 'ATIVISTA' | 'DIAD'
  const [pendencias, setPendencias] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      const total = await offlineStorage.contarPendencias();
      setPendencias(total);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />

      {/* Barra de Status e Cabeçalho Superior */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.flag}>🇦🇴</Text>
          <View>
            <Text style={styles.brandTitle}>GPS ELEITORAL 2027</Text>
            <Text style={styles.brandSub}>Inteligência Territorial & Terreno</Text>
          </View>
        </View>

        <View style={styles.syncStatusPill}>
          <View
            style={[
              styles.syncDot,
              { backgroundColor: pendencias > 0 ? THEME.colors.batalha : THEME.colors.bastaio },
            ]}
          />
          <Text style={styles.syncStatusText}>
            {pendencias > 0 ? `${pendencias} na fila local` : 'Nuvem Conectada'}
          </Text>
        </View>
      </View>

      {/* Renderização do Ecrã Selecionado */}
      <View style={styles.screenContainer}>
        {tabAtiva === 'MAPA' && (
          <TacticalMapScreen onNavigateToDoorToDoor={() => setTabAtiva('ATIVISTA')} />
        )}
        {tabAtiva === 'ATIVISTA' && <ActivistDoorToDoorScreen />}
        {tabAtiva === 'DIAD' && <ElectionDayScreen />}
      </View>

      {/* Barra de Navegação Inferior (3 Ecrãs) */}
      <View style={styles.bottomNav}>
        {/* Ecrã 1: Mapa & Tática */}
        <TouchableOpacity
          style={[styles.navItem, tabAtiva === 'MAPA' && styles.navItemActive]}
          onPress={() => setTabAtiva('MAPA')}
        >
          <Text style={styles.navIcon}>🗺️</Text>
          <Text style={[styles.navLabel, tabAtiva === 'MAPA' && styles.navLabelActive]}>
            Tática / Mapa
          </Text>
        </TouchableOpacity>

        {/* Ecrã 2: Porta-a-Porta */}
        <TouchableOpacity
          style={[styles.navItem, tabAtiva === 'ATIVISTA' && styles.navItemActive]}
          onPress={() => setTabAtiva('ATIVISTA')}
        >
          <View style={styles.iconWithBadge}>
            <Text style={styles.navIcon}>🚶</Text>
            {pendencias > 0 && (
              <View style={styles.badgeMini}>
                <Text style={styles.badgeMiniText}>{pendencias}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.navLabel, tabAtiva === 'ATIVISTA' && styles.navLabelActive]}>
            Porta-a-Porta
          </Text>
        </TouchableOpacity>

        {/* Ecrã 3: Painel do Dia D */}
        <TouchableOpacity
          style={[styles.navItem, tabAtiva === 'DIAD' && styles.navItemActive]}
          onPress={() => setTabAtiva('DIAD')}
        >
          <Text style={styles.navIcon}>🗳️</Text>
          <Text style={[styles.navLabel, tabAtiva === 'DIAD' && styles.navLabelActive]}>
            Dia D / Atas
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 22,
    marginRight: 8,
  },
  brandTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSub: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
  },
  syncStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  syncStatusText: {
    color: THEME.colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingVertical: 8,
    paddingBottom: 16,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: THEME.colors.accent,
    marginTop: -2,
  },
  iconWithBadge: {
    position: 'relative',
  },
  badgeMini: {
    position: 'absolute',
    top: -2,
    right: -8,
    backgroundColor: THEME.colors.batalha,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeMiniText: {
    color: '#0F172A',
    fontSize: 9,
    fontWeight: '800',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  navLabelActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
});
