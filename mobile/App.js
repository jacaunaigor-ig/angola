import React, { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { THEME } from './src/theme/theme';
import TacticalMapScreen from './src/screens/TacticalMapScreen';
import ActivistDoorToDoorScreen from './src/screens/ActivistDoorToDoorScreen';
import ElectionDayScreen from './src/screens/ElectionDayScreen';
import { offlineStorage } from './src/services/offlineStorage';
import { registerBackgroundSync } from './src/services/backgroundSync';
import { apiService, CAMPANHA_PADRAO_ID } from './src/services/api';
import { sqliteOutbox } from './src/services/sqliteOutbox';
import { outboxSync } from './src/services/outboxSync';

export default function App() {
  const [tabAtiva, setTabAtiva] = useState('MAPA'); // 'MAPA' | 'ATIVISTA' | 'DIAD'
  const [pendencias, setPendencias] = useState(0);
  const [autenticado, setAutenticado] = useState(false);
  const [loginAberto, setLoginAberto] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [campanhaId, setCampanhaId] = useState(CAMPANHA_PADRAO_ID);
  const [erroLogin, setErroLogin] = useState('');
  const [aAutenticar, setAAutenticar] = useState(false);

  useEffect(() => {
    let synchronizing = false;
    const refreshAndSync = async (trySync = false) => {
      try {
        const total = await offlineStorage.contarPendencias();
        setPendencias(total);
        if (!trySync || synchronizing || total === 0) return;
        if (!(await offlineStorage.obterToken())) return;
        const network = await Network.getNetworkStateAsync();
        if (!network.isConnected || network.isInternetReachable === false) return;
        synchronizing = true;
        const result = await apiService.sincronizarFilaOffline();
        if (!result.sucesso) {
          console.warn('[Sync] Fila preservada para nova tentativa:', result.erro);
        }
        setPendencias(await offlineStorage.contarPendencias());
      } catch (error) {
        console.error('[Sync] Falha ao atualizar fila/sincronizar:', error);
      } finally {
        synchronizing = false;
      }
    };

    offlineStorage.obterToken()
      .then((token) => {
        setAutenticado(Boolean(token));
        if (!token) setLoginAberto(true);
      })
      .catch((error) => {
        console.error('[Auth] Não foi possível carregar a sessão segura:', error);
        setLoginAberto(true);
      });

    sqliteOutbox.inicializar().catch((e) => console.warn('[SQLite] Erro ao inicializar outbox:', e));
    outboxSync.iniciar();

    registerBackgroundSync().catch((error) => {
      console.warn('[BackgroundSync] Tarefa não registada:', error.message);
    });

    refreshAndSync(true);

    const networkSubscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) refreshAndSync(true);
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAndSync(true);
    });

    const intervalSync = setInterval(() => refreshAndSync(false), 30000);
    const intervalBadge = setInterval(async () => {
      const total = await offlineStorage.contarPendencias();
      setPendencias(total);
    }, 3000);

    return () => {
      clearInterval(intervalSync);
      clearInterval(intervalBadge);
      networkSubscription.remove();
      appStateSubscription.remove();
      outboxSync.parar();
    };
  }, []);

  const entrar = async () => {
    setAAutenticar(true);
    setErroLogin('');
    try {
      await apiService.autenticar(email.trim(), senha, campanhaId.trim());
      setAutenticado(true);
      setLoginAberto(false);
      setSenha('');
      const total = await offlineStorage.contarPendencias();
      if (total > 0) {
        const result = await apiService.sincronizarFilaOffline(campanhaId.trim());
        if (!result.sucesso) console.warn('[Sync] Fila preservada:', result.erro);
        setPendencias(await offlineStorage.contarPendencias());
      }
    } catch (error) {
      setErroLogin(error.message || 'Não foi possível iniciar sessão.');
    } finally {
      setAAutenticar(false);
    }
  };

  const sair = async () => {
    await offlineStorage.removerToken();
    setAutenticado(false);
    setLoginAberto(true);
  };

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
            {pendencias > 0 ? `${pendencias} na fila local` : autenticado ? 'Sessão ativa' : 'Sem sessão'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.authButton}
          onPress={() => (autenticado ? sair() : setLoginAberto(true))}
        >
          <Text style={styles.authButtonText}>{autenticado ? 'Sair' : 'Entrar'}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={loginAberto}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (autenticado) setLoginAberto(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.loginOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Iniciar sessão</Text>
            <Text style={styles.loginDescription}>
              A autenticação é necessária para associar os registos ao mobilizador e à campanha.
            </Text>
            <TextInput
              style={styles.loginInput}
              value={campanhaId}
              onChangeText={setCampanhaId}
              placeholder="ID da campanha (UUID)"
              placeholderTextColor={THEME.colors.textSecondary}
              autoCapitalize="none"
              accessibilityLabel="ID da campanha"
            />
            <TextInput
              style={styles.loginInput}
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              placeholderTextColor={THEME.colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              accessibilityLabel="E-mail"
            />
            <TextInput
              style={styles.loginInput}
              value={senha}
              onChangeText={setSenha}
              placeholder="Senha"
              placeholderTextColor={THEME.colors.textSecondary}
              secureTextEntry
              autoComplete="password"
              accessibilityLabel="Senha"
            />
            {erroLogin ? <Text style={styles.loginError}>{erroLogin}</Text> : null}
            <TouchableOpacity
              style={[styles.loginSubmit, aAutenticar && styles.loginSubmitDisabled]}
              onPress={entrar}
              disabled={aAutenticar || !email.trim() || !senha || !campanhaId.trim()}
            >
              <Text style={styles.loginSubmitText}>
                {aAutenticar ? 'A validar…' : 'Entrar com segurança'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  authButton: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 8,
  },
  authButtonText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  loginOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
  },
  loginCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  loginTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  loginDescription: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  loginInput: {
    color: THEME.colors.textPrimary,
    backgroundColor: THEME.colors.background,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  loginError: {
    color: THEME.colors.oposicao,
    fontSize: 12,
    marginBottom: 10,
  },
  loginSubmit: {
    alignItems: 'center',
    backgroundColor: THEME.colors.accent,
    borderRadius: 8,
    padding: 12,
    marginTop: 2,
  },
  loginSubmitDisabled: {
    opacity: 0.55,
  },
  loginSubmitText: {
    color: THEME.colors.background,
    fontWeight: '800',
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
