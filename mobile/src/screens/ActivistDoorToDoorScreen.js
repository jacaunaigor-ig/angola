import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { THEME } from '../theme/theme';
import { offlineStorage, generateUUID } from '../services/offlineStorage';
import { apiService } from '../services/api';

const DORES_OPCOES = [
  { id: 'AGUA', label: '💧 Falta de Água' },
  { id: 'ENERGIA', label: '⚡ Cortes de Luz' },
  { id: 'EMPREGO', label: '💼 Desemprego Jovem' },
  { id: 'SANEAMENTO', label: '🚯 Saneamento / Lixo' },
  { id: 'ESTRADAS', label: '🚧 Vias e Buracos' },
  { id: 'SAUDE', label: '🏥 Posto de Saúde' },
  { id: 'EDUCACAO', label: '🎒 Vagas Escolares' },
  { id: 'SEGURANCA', label: '🛡️ Segurança / Assaltos' },
];

const FAIXAS_ETARIAS = ['18-24', '25-35', '36-50', '50+'];

export default function ActivistDoorToDoorScreen() {
  const [sentimento, setSentimento] = useState(null); // 'POSITIVO' | 'NEUTRO' | 'NEGATIVO'
  const [doresSelecionadas, setDoresSelecionadas] = useState([]);
  const [faixaEtaria, setFaixaEtaria] = useState('18-24');
  const [observacoes, setObservacoes] = useState('');
  const [coordenadas, setCoordenadas] = useState({
    latitude: -8.9160,
    longitude: 13.2660,
    precisao: 3.8,
  });
  const [pendencias, setPendencias] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  useEffect(() => {
    carregarPendencias();
    capturarLocalizacaoNativa();
  }, []);

  const carregarPendencias = async () => {
    const total = await offlineStorage.contarPendencias();
    setPendencias(total);
  };

  const capturarLocalizacaoNativa = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (pos && pos.coords) {
          // Perturbação deliberada para privacidade segundo a Lei n.º 22/11 (~100m)
          const offsetLat = (Math.random() - 0.5) * 0.0018;
          const offsetLon = (Math.random() - 0.5) * 0.0018;
          setCoordenadas({
            latitude: Number((pos.coords.latitude + offsetLat).toFixed(6)),
            longitude: Number((pos.coords.longitude + offsetLon).toFixed(6)),
            precisao: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 5.0,
          });
          return;
        }
      }
    } catch (err) {
      console.warn('[GPS] Erro ao obter localização nativa expo-location:', err.message);
    }

    // Fallback gracioso para ambiente web ou sem permissão
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const offsetLat = (Math.random() - 0.5) * 0.0018;
          const offsetLon = (Math.random() - 0.5) * 0.0018;
          setCoordenadas({
            latitude: Number((pos.coords.latitude + offsetLat).toFixed(6)),
            longitude: Number((pos.coords.longitude + offsetLon).toFixed(6)),
            precisao: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 4.5,
          });
        },
        () => {
          setCoordenadas({ latitude: -8.9165, longitude: 13.2664, precisao: 4.2 });
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else {
      setCoordenadas({ latitude: -8.9165, longitude: 13.2664, precisao: 4.2 });
    }
  };

  const alternarDor = (dorId) => {
    if (doresSelecionadas.includes(dorId)) {
      setDoresSelecionadas(doresSelecionadas.filter((d) => d !== dorId));
    } else {
      setDoresSelecionadas([...doresSelecionadas, dorId]);
    }
  };

  const salvarVisitaOffline = async () => {
    if (!sentimento) {
      Alert.alert('Sentimento em falta', 'Indique se a casa apoia, está indecisa ou recusa.');
      return;
    }

    setSalvando(true);
    try {
      const identity = await offlineStorage.obterIdentidade();
      if (!identity?.ativista_id || !identity?.campanha_id) {
        throw new Error('Inicie sessão com uma conta de mobilizador para registar visitas.');
      }
      const uuidVisita = generateUUID();
      const novaVisita = {
        uuid: uuidVisita,
        id: uuidVisita,
        campanha_id: identity.campanha_id,
        ativista_id: identity.ativista_id,
        municipio: 'Talatona',
        localizacao: {
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
        },
        precisao_gps_metros: coordenadas.precisao,
        sentimento,
        dores_prioritarias: doresSelecionadas,
        faixa_etaria: faixaEtaria,
        observacoes,
        registado_em: new Date().toISOString(),
        metadados_aparelho: {
          plataforma: 'mobile',
          bateria: 85,
        },
      };

      await offlineStorage.enfileirarVisita(novaVisita);
      await carregarPendencias();

      setMensagemSucesso(`Visita gravada no telemóvel · ${novaVisita.id.slice(-6)}`);
      setTimeout(() => setMensagemSucesso(''), 4000);

      // Limpar formulário para a próxima casa
      setSentimento(null);
      setDoresSelecionadas([]);
      setObservacoes('');
      capturarLocalizacaoNativa();
    } catch (err) {
      console.error('Erro ao gravar visita:', err);
      Alert.alert('Não foi possível gravar', err.message || 'Falha no armazenamento local do telemóvel.');
    } finally {
      setSalvando(false);
    }
  };

  const dispararSincronizacaoManual = async () => {
    const res = await apiService.sincronizarFilaOffline();
    await carregarPendencias();
    if (res.sucesso) {
      Alert.alert('Fila enviada', `${res.total_sincronizadas || 0} visitas chegaram à sala de comando.`);
    } else {
      Alert.alert('Sem rede', `${res.total_pendentes} visitas continuam no telemóvel.`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.faixa} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTexto}>
            <Text style={styles.eyebrow}>Campo · sem nome nem BI</Text>
            <Text style={styles.headerTitle}>Porta-a-porta</Text>
          </View>
          <TouchableOpacity style={styles.syncBadgeButton} onPress={dispararSincronizacaoManual}>
            <View style={[styles.syncDot, pendencias > 0 ? styles.syncDotFila : styles.syncDotOk]} />
            <Text style={styles.syncBadgeText}>
              {pendencias > 0 ? `${pendencias} na fila` : 'Fila vazia'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gpsCard}>
          <Text style={styles.gpsCoords}>
            {coordenadas.latitude.toFixed(4)}, {coordenadas.longitude.toFixed(4)}
          </Text>
          <Text style={styles.gpsPrecision}>Posição perturbada ~110 m · Lei 22/11</Text>
        </View>

        <Text style={styles.privacidade}>
          Só carências do sítio, idade e humor. Nada de nome, BI ou telefone. A visita fica no aparelho até haver rede.
        </Text>

        {mensagemSucesso ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{mensagemSucesso}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Humor na porta</Text>
        <View style={styles.sentimentRow}>
          <TouchableOpacity
            style={[styles.sentimentBtn, sentimento === 'POSITIVO' && styles.sentimentBtnActivePositivo]}
            onPress={() => setSentimento('POSITIVO')}
          >
            <Text style={styles.sentimentEmoji}>🙂</Text>
            <Text style={[styles.sentimentLabel, sentimento === 'POSITIVO' && { color: THEME.colors.bastaio }]}>
              Apoia
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sentimentBtn, sentimento === 'NEUTRO' && styles.sentimentBtnActiveNeutro]}
            onPress={() => setSentimento('NEUTRO')}
          >
            <Text style={styles.sentimentEmoji}>😐</Text>
            <Text style={[styles.sentimentLabel, sentimento === 'NEUTRO' && { color: THEME.colors.batalha }]}>
              Indeciso
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sentimentBtn, sentimento === 'NEGATIVO' && styles.sentimentBtnActiveNegativo]}
            onPress={() => setSentimento('NEGATIVO')}
          >
            <Text style={styles.sentimentEmoji}>🙁</Text>
            <Text style={[styles.sentimentLabel, sentimento === 'NEGATIVO' && { color: THEME.colors.oposicao }]}>
              Recusa
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Idade</Text>
        <View style={styles.ageRow}>
          {FAIXAS_ETARIAS.map((faixa) => {
            const isSelected = faixaEtaria === faixa;
            const isYouth = faixa === '18-24' || faixa === '25-35';
            return (
              <TouchableOpacity
                key={faixa}
                style={[styles.ageBtn, isSelected && styles.ageBtnActive]}
                onPress={() => setFaixaEtaria(faixa)}
              >
                <Text style={[styles.ageLabel, isSelected && styles.ageLabelActive]}>{faixa}</Text>
                {isYouth ? <Text style={styles.youthPill}>jovem</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Carências da casa</Text>
        <View style={styles.doresGrid}>
          {DORES_OPCOES.map((item) => {
            const selecionado = doresSelecionadas.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.dorChip, selecionado && styles.dorChipSelected]}
                onPress={() => alternarDor(item.id)}
              >
                <Text style={[styles.dorChipText, selecionado && styles.dorChipTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Nota do brigadista</Text>
        <TextInput
          style={styles.obsInput}
          placeholder="O que pediram, sem identificar a pessoa"
          placeholderTextColor={THEME.colors.textDisabled}
          value={observacoes}
          onChangeText={setObservacoes}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.btnSalvar, salvando && { opacity: 0.7 }]}
          onPress={salvarVisitaOffline}
          disabled={salvando}
        >
          <Text style={styles.btnSalvarText}>
            {salvando ? 'A gravar no telemóvel…' : 'Registar visita'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  faixa: {
    height: 4,
    backgroundColor: THEME.colors.flagRed,
  },
  content: {
    padding: THEME.spacing.md,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  headerTexto: {
    flex: 1,
  },
  eyebrow: {
    color: THEME.colors.flagGold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 2,
  },
  syncBadgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  syncDotOk: {
    backgroundColor: THEME.colors.bastaio,
  },
  syncDotFila: {
    backgroundColor: THEME.colors.flagGold,
  },
  syncBadgeText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  gpsCard: {
    backgroundColor: THEME.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
  },
  gpsCoords: {
    color: THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  gpsPrecision: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  privacidade: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  successBanner: {
    backgroundColor: 'rgba(61, 190, 139, 0.14)',
    borderColor: THEME.colors.bastaio,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 14,
  },
  successText: {
    color: THEME.colors.bastaio,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  sentimentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  sentimentBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 92,
    justifyContent: 'center',
  },
  sentimentBtnActivePositivo: {
    borderColor: THEME.colors.bastaio,
    backgroundColor: 'rgba(61, 190, 139, 0.16)',
  },
  sentimentBtnActiveNeutro: {
    borderColor: THEME.colors.batalha,
    backgroundColor: 'rgba(224, 138, 60, 0.16)',
  },
  sentimentBtnActiveNegativo: {
    borderColor: THEME.colors.flagRed,
    backgroundColor: 'rgba(206, 17, 38, 0.18)',
  },
  sentimentEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  sentimentLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  ageRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  ageBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  ageBtnActive: {
    borderColor: THEME.colors.flagGold,
    backgroundColor: 'rgba(245, 197, 24, 0.14)',
  },
  youthPill: {
    fontSize: 10,
    color: THEME.colors.flagGold,
    fontWeight: '700',
    marginTop: 2,
  },
  ageLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  ageLabelActive: {
    color: THEME.colors.textPrimary,
  },
  doresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dorChip: {
    width: '48.5%',
    marginBottom: 8,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.md,
  },
  dorChipSelected: {
    borderColor: THEME.colors.flagGold,
    backgroundColor: 'rgba(245, 197, 24, 0.12)',
  },
  dorChipText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  dorChipTextSelected: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  obsInput: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    color: THEME.colors.textPrimary,
    fontSize: 14,
    minHeight: 88,
    marginBottom: 18,
    textAlignVertical: 'top',
  },
  btnSalvar: {
    backgroundColor: THEME.colors.flagGold,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnSalvarText: {
    color: '#1a1204',
    fontSize: 16,
    fontWeight: '800',
  },
});
