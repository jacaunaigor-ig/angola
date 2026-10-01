import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { THEME } from '../theme/theme';
import { apiService } from '../services/api';

const { height } = Dimensions.get('window');

export default function TacticalMapScreen({ navigation, onNavigateToDoorToDoor }) {
  const [municipioBusca, setMunicipioBusca] = useState('Talatona');
  const [dadosTaticos, setDadosTaticos] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [assembleias, setAssembleias] = useState([]);
  const [sheetExpandido, setSheetExpandido] = useState(false);

  // Animação de altura do BottomSheet
  const [sheetAnim] = useState(new Animated.Value(240));

  useEffect(() => {
    carregarDadosMunicipio(municipioBusca);
  }, []);

  const toggleBottomSheet = () => {
    const toValue = sheetExpandido ? 240 : height * 0.65;
    Animated.spring(sheetAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
    }).start();
    setSheetExpandido(!sheetExpandido);
  };

  const carregarDadosMunicipio = async (municipio) => {
    setCarregando(true);
    try {
      const dados = await apiService.obterResumoMunicipio(municipio);
      setDadosTaticos(dados);

      // Carrega assembleias fictícias/locais para a camada de mapa
      const locais = await apiService.buscarLocaisProximos(13.2667, -8.9167, 4000);
      setAssembleias(locais);
    } catch (err) {
      console.warn('Erro ao carregar dados:', err);
    } finally {
      setCarregando(false);
    }
  };

  const getCorRisco = (status) => {
    switch (status) {
      case 'BASTIAO':
        return THEME.colors.bastaio;
      case 'OPOSICAO':
        return THEME.colors.oposicao;
      default:
        return THEME.colors.batalha;
    }
  };

  const indicador = dadosTaticos?.indicador_risco || {
    cor: '🟡',
    status: 'CAMPO_BATALHA',
    rotulo: 'Zona em Disputa',
    descricao: 'Carregando dados territoriais...',
  };

  return (
    <View style={styles.container}>
      {/* 1. Barra Superior com Busca Tática */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar Município (ex: Talatona, Viana...)"
            placeholderTextColor={THEME.colors.textSecondary}
            value={municipioBusca}
            onChangeText={setMunicipioBusca}
            onSubmitEditing={() => carregarDadosMunicipio(municipioBusca)}
          />
        </View>
        <TouchableOpacity
          style={styles.btnBuscar}
          onPress={() => carregarDadosMunicipio(municipioBusca)}
        >
          <Text style={styles.btnBuscarText}>Filtrar</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Visualizador Cartográfico Tático (Camada Vetorial com Cache Offline) */}
      <View style={styles.mapCanvas}>
        {/* Simulação de Malha Cartográfica Dark Mode */}
        <View style={styles.mapGridPattern} />

        {/* Marcadores Vetoriais de Assembleias com Cores Políticas */}
        <View style={styles.mockMarkersLayer}>
          <View style={[styles.markerPin, { top: '35%', left: '42%', backgroundColor: THEME.colors.bastaio }]}>
            <Text style={styles.markerText}>🟢 Bastião Morro Bento</Text>
          </View>

          <View style={[styles.markerPin, { top: '48%', left: '55%', backgroundColor: THEME.colors.batalha }]}>
            <Text style={styles.markerText}>🟡 C. Batalha Camama</Text>
          </View>

          <View style={[styles.markerPin, { top: '25%', left: '68%', backgroundColor: THEME.colors.oposicao }]}>
            <Text style={styles.markerText}>🔴 Oposição Viana Sede</Text>
          </View>
        </View>

        {/* Bússola e Indicador GPS Ativo */}
        <View style={styles.gpsIndicatorBox}>
          <View style={styles.gpsPulseDot} />
          <Text style={styles.gpsText}>GPS Satélite: Conectado (Precisão 4.2m)</Text>
        </View>

        {/* Legenda Flutuante */}
        <View style={styles.floatingLegend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: THEME.colors.bastaio }]} />
            <Text style={styles.legendLabel}>Bastião</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: THEME.colors.batalha }]} />
            <Text style={styles.legendLabel}>Batalha</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: THEME.colors.oposicao }]} />
            <Text style={styles.legendLabel}>Oposição</Text>
          </View>
        </View>
      </View>

      {/* 3. BottomSheet Dinâmico: Indicador de Risco e Dores Locais */}
      <Animated.View style={[styles.bottomSheet, { height: sheetAnim }]}>
        {/* Handle de Toque para Expandir/Recolher */}
        <TouchableOpacity style={styles.sheetHandleArea} onPress={toggleBottomSheet}>
          <View style={styles.sheetHandleBar} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.sheetContent}>
          {carregando ? (
            <ActivityIndicator size="small" color={THEME.colors.accent} />
          ) : (
            <>
              {/* Cabeçalho do Território com Badge de Risco */}
              <View style={styles.sheetHeaderRow}>
                <View>
                  <Text style={styles.sheetSubtitle}>Diagnóstico Territorial</Text>
                  <Text style={styles.sheetTitle}>{dadosTaticos?.municipio || municipioBusca}</Text>
                </View>
                <View
                  style={[
                    styles.riskBadge,
                    { borderColor: getCorRisco(indicador.status) },
                  ]}
                >
                  <Text style={styles.riskIcon}>{indicador.cor}</Text>
                  <Text
                    style={[
                      styles.riskText,
                      { color: getCorRisco(indicador.status) },
                    ]}
                  >
                    {indicador.rotulo}
                  </Text>
                </View>
              </View>

              {/* Métrica da Demografia Jovem (18-35 anos) */}
              <View style={styles.statCard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Eleitorado Jovem (18-35)</Text>
                  <Text style={styles.statHighlight}>
                    {dadosTaticos?.inteligencia_campo?.demografia_jovem?.perc_juventude || 62}% do eleitorado
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${dadosTaticos?.inteligencia_campo?.demografia_jovem?.perc_juventude || 62}%`,
                        backgroundColor: THEME.colors.accent,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Ranking das Dores do Eleitorado */}
              <Text style={styles.sectionHeading}>🚨 Dores Críticas para Discurso Político</Text>
              {(dadosTaticos?.inteligencia_campo?.principais_dores || [
                { dor: 'EMPREGO', percentual: 42.0 },
                { dor: 'AGUA', percentual: 35.5 },
                { dor: 'ENERGIA', percentual: 22.5 },
              ]).map((item, idx) => (
                <View key={idx} style={styles.dorItem}>
                  <View style={styles.dorHeader}>
                    <Text style={styles.dorNome}>
                      {idx + 1}. {item.dor}
                    </Text>
                    <Text style={styles.dorPerc}>{item.percentual}% dos relatos</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${item.percentual}%`,
                          backgroundColor:
                            idx === 0
                              ? THEME.colors.oposicao
                              : idx === 1
                              ? THEME.colors.batalha
                              : THEME.colors.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}

              {/* Botão de Ação Rápida: Ativar Porta-a-Porta */}
              <TouchableOpacity
                style={styles.btnAcaoTatica}
                onPress={() => onNavigateToDoorToDoor && onNavigateToDoorToDoor()}
              >
                <Text style={styles.btnAcaoTaticaText}>🚶 Iniciar Abordagem Porta-a-Porta</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.md,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    alignItems: 'center',
    zIndex: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily,
  },
  btnBuscar: {
    marginLeft: 10,
    backgroundColor: THEME.colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: THEME.borderRadius.md,
  },
  btnBuscarText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#0a0f1d',
    position: 'relative',
    overflow: 'hidden',
  },
  mapGridPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  mockMarkersLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  markerPin: {
    position: 'absolute',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.full,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 4,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  gpsIndicatorBox: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  gpsPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.bastaio,
    marginRight: 8,
  },
  gpsText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '500',
  },
  floatingLegend: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  bottomSheet: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  sheetHandleArea: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  sheetHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.colors.border,
  },
  sheetContent: {
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: 30,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sheetTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  riskIcon: {
    marginRight: 4,
    fontSize: 13,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
  },
  statHighlight: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionHeading: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 10,
  },
  dorItem: {
    marginBottom: 10,
  },
  dorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dorNome: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  dorPerc: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  btnAcaoTatica: {
    backgroundColor: THEME.colors.accent,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  btnAcaoTaticaText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
});
