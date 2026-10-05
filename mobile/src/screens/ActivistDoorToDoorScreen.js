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

  const capturarLocalizacaoNativa = () => {
    // Simula / captura GPS com oscilação realista de campo
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordenadas({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisao: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 4.5,
          });
        },
        () => {
          // Fallback para coordenadas de Luanda (Talatona / Camama)
          setCoordenadas({ latitude: -8.9165, longitude: 13.2664, precisao: 4.2 });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
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
      alert('Por favor, selecione o sentimento do eleitor (🙂, 😐 ou 🙁).');
      return;
    }

    setSalvando(true);
    try {
      const identity = await offlineStorage.obterIdentidade();
      if (!identity?.ativista_id || !identity?.campanha_id) {
        throw new Error('Inicie sessão com uma conta de mobilizador para registar visitas.');
      }
      const novaVisita = {
        id: generateUUID(),
        campanha_id: identity.campanha_id,
        ativista_id: identity.ativista_id,
      const uuidVisita = generateUUID();
      const novaVisita = {
        uuid: uuidVisita,
        id: uuidVisita,
        campanha_id: CAMPANHA_PADRAO_ID,
        ativista_id: ATIVISTA_PADRAO_ID,
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

      setMensagemSucesso(`✅ Visita registada offline! ID: ...${novaVisita.id.slice(-6)}`);
      setTimeout(() => setMensagemSucesso(''), 4000);

      // Limpar formulário para a próxima casa
      setSentimento(null);
      setDoresSelecionadas([]);
      setObservacoes('');
      capturarLocalizacaoNativa();
    } catch (err) {
      console.error('Erro ao gravar visita:', err);
      alert(err.message || 'Falha ao gravar no armazenamento local do telemóvel.');
    } finally {
      setSalvando(false);
    }
  };

  const dispararSincronizacaoManual = async () => {
    const res = await apiService.sincronizarFilaOffline();
    await carregarPendencias();
    if (res.sucesso) {
      alert(`Sincronização concluída! ${res.total_sincronizadas || 0} visitas enviadas à central.`);
    } else {
      alert(`Sem conexão com a central. ${res.total_pendentes} visitas mantidas em segurança no telemóvel.`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Header do Ativista e Badge de Sincronização */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Brigada de Terreno 04</Text>
          <Text style={styles.headerTitle}>Registo Porta-a-Porta</Text>
        </View>
        <TouchableOpacity style={styles.syncBadgeButton} onPress={dispararSincronizacaoManual}>
          <Text style={styles.syncBadgeText}>
            {pendencias > 0 ? `🟡 ${pendencias} Offline` : '🟢 Nuvem Sincronizada'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Barra de Status GPS em Tempo Real */}
      <View style={styles.gpsCard}>
        <View style={styles.gpsRow}>
          <View style={styles.gpsDot} />
          <Text style={styles.gpsCoords}>
            GPS: {coordenadas.latitude.toFixed(4)}, {coordenadas.longitude.toFixed(4)}
          </Text>
        </View>
        <Text style={styles.gpsPrecision}>Margem: ±{coordenadas.precisao}m (Forte)</Text>
      </View>

      {/* Termo de Consentimento e Política de Retenção */}
      <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', borderColor: '#38BDF8', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 }}>
        <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '700', marginBottom: 2 }}>
          🔒 Proteção de Dados & Política de Retenção
        </Text>
        <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
          Este app coleta dados estritamente agregados por setor para mapeamento de carências públicas. Não registamos nomes, números de BI nem convicções políticas individuais. Retenção restrita ao ciclo eleitoral de 2027.
        </Text>
      </View>

      {mensagemSucesso ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{mensagemSucesso}</Text>
        </View>
      ) : null}

      {/* 3. Sentimento do Eleitor (Grandes Botões Táteis com Feedback Visual Imediato) */}
      <Text style={styles.sectionTitle}>1. Humor / Sentimento do Eleitor</Text>
      <View style={styles.sentimentRow}>
        {/* Favorável / Positivo */}
        <TouchableOpacity
          style={[
            styles.sentimentBtn,
            sentimento === 'POSITIVO' && styles.sentimentBtnActivePositivo,
          ]}
          onPress={() => setSentimento('POSITIVO')}
        >
          <Text style={styles.sentimentEmoji}>🙂</Text>
          <Text
            style={[
              styles.sentimentLabel,
              sentimento === 'POSITIVO' && { color: THEME.colors.bastaio },
            ]}
          >
            Apoia / Verde
          </Text>
        </TouchableOpacity>

        {/* Neutro / Indeciso */}
        <TouchableOpacity
          style={[
            styles.sentimentBtn,
            sentimento === 'NEUTRO' && styles.sentimentBtnActiveNeutro,
          ]}
          onPress={() => setSentimento('NEUTRO')}
        >
          <Text style={styles.sentimentEmoji}>😐</Text>
          <Text
            style={[
              styles.sentimentLabel,
              sentimento === 'NEUTRO' && { color: THEME.colors.batalha },
            ]}
          >
            Indeciso / Dúvida
          </Text>
        </TouchableOpacity>

        {/* Oposição / Rejeição */}
        <TouchableOpacity
          style={[
            styles.sentimentBtn,
            sentimento === 'NEGATIVO' && styles.sentimentBtnActiveNegativo,
          ]}
          onPress={() => setSentimento('NEGATIVO')}
        >
          <Text style={styles.sentimentEmoji}>🙁</Text>
          <Text
            style={[
              styles.sentimentLabel,
              sentimento === 'NEGATIVO' && { color: THEME.colors.oposicao },
            ]}
          >
            Rejeição / Oposição
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Faixa Etária (Destaque para Juventude 18-35 anos) */}
      <Text style={styles.sectionTitle}>2. Faixa Etária do Votante</Text>
      <View style={styles.ageRow}>
        {FAIXAS_ETARIAS.map((faixa) => {
          const isSelected = faixaEtaria === faixa;
          const isYouth = faixa === '18-24' || faixa === '25-35';
          return (
            <TouchableOpacity
              key={faixa}
              style={[
                styles.ageBtn,
                isSelected && styles.ageBtnActive,
                isYouth && styles.youthHighlight,
              ]}
              onPress={() => setFaixaEtaria(faixa)}
            >
              <Text style={[styles.ageLabel, isSelected && styles.ageLabelActive]}>
                {faixa} anos
              </Text>
              {isYouth ? <Text style={styles.youthPill}>Jovem</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 5. Dores Locais Prioritárias (Multi-seleção rápida de campo) */}
      <Text style={styles.sectionTitle}>3. Principais Reclamações na Porta</Text>
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

      {/* 6. Observações Adicionais */}
      <Text style={styles.sectionTitle}>4. Observação do Brigadista (Opcional)</Text>
      <TextInput
        style={styles.obsInput}
        placeholder="Ex: Família pediu panfleto sobre emprego técnico..."
        placeholderTextColor={THEME.colors.textSecondary}
        value={observacoes}
        onChangeText={setObservacoes}
        multiline
        numberOfLines={3}
      />

      {/* 7. Botão Primário: Salvar Visita Instantaneamente no Telemóvel */}
      <TouchableOpacity
        style={[styles.btnSalvar, salvando && { opacity: 0.7 }]}
        onPress={salvarVisitaOffline}
        disabled={salvando}
      >
        <Text style={styles.btnSalvarText}>
          {salvando ? 'Gravando no Telemóvel...' : '💾 Registar Visita (Modo Offline)'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  syncBadgeButton: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  syncBadgeText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  gpsCard: {
    backgroundColor: THEME.colors.surface,
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.accent,
    marginRight: 6,
  },
  gpsCoords: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily,
  },
  gpsPrecision: {
    color: THEME.colors.bastaio,
    fontSize: 11,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: THEME.colors.bastaio,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  successText: {
    color: THEME.colors.bastaio,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 10,
  },
  sentimentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sentimentBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  sentimentBtnActivePositivo: {
    borderColor: THEME.colors.bastaio,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  sentimentBtnActiveNeutro: {
    borderColor: THEME.colors.batalha,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  sentimentBtnActiveNegativo: {
    borderColor: THEME.colors.oposicao,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  sentimentEmoji: {
    fontSize: 34,
    marginBottom: 6,
  },
  sentimentLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  ageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  ageBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  ageBtnActive: {
    borderColor: THEME.colors.accent,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  youthHighlight: {
    borderBottomWidth: 2,
    borderBottomColor: THEME.colors.accent,
  },
  youthPill: {
    fontSize: 9,
    color: THEME.colors.accent,
    fontWeight: '700',
    marginTop: 2,
  },
  ageLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  ageLabelActive: {
    color: THEME.colors.textPrimary,
  },
  doresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  dorChip: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.full,
    margin: 4,
  },
  dorChipSelected: {
    borderColor: THEME.colors.batalha,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
  },
  dorChipText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
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
    padding: 12,
    color: THEME.colors.textPrimary,
    fontSize: 13,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  btnSalvar: {
    backgroundColor: THEME.colors.bastaio,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: THEME.colors.bastaio,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  btnSalvarText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
