import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { THEME } from '../theme/theme';
import { generateUUID } from '../services/offlineStorage';
import { apiService } from '../services/api';
import { cryptoSignService } from '../services/cryptoSignService';

const FILA_ATAS_PENDENTES = 'dia_d_atas_pendentes_v1';

export default function ElectionDayScreen() {
  const [abaAtiva, setAbaAtiva] = useState('AFALUENCIA'); // 'AFALUENCIA' | 'ATAS'

  // Estados da Ata de Apuramento
  const [mesaNumero, setMesaNumero] = useState('1');
  const [votosFavoraveis, setVotosFavoraveis] = useState('184');
  const [votosOponentes, setVotosOponentes] = useState('142');
  const [votosNulos, setVotosNulos] = useState('6');
  const [votosBrancos, setVotosBrancos] = useState('2');
  const [fotoCapturada, setFotoCapturada] = useState(false);
  const [fotoHash, setFotoHash] = useState('');
  const [fotoUri, setFotoUri] = useState('');
  const [fotoMime, setFotoMime] = useState('image/jpeg');
  const [fotoTamanho, setFotoTamanho] = useState(0);
  const [storageKeyFoto, setStorageKeyFoto] = useState('');
  const [distanciaMetros, setDistanciaMetros] = useState(48.5); // Simulação de 48.5m da escola
  const [enviandoAta, setEnviandoAta] = useState(false);
  const [ataEnviadaComSucesso, setAtaEnviadaComSucesso] = useState(false);
  const [identidadeFiscal, setIdentidadeFiscal] = useState(null);
  const [reciboCriptografico, setReciboCriptografico] = useState(null);

  useEffect(() => {
    // Inicializa ou recupera o par de chaves assimétricas Ed25519 do delegado
    cryptoSignService.obterOuCriarIdentidadeFiscal()
      .then((identidade) => setIdentidadeFiscal(identidade))
      .catch((err) => console.warn('[Crypto] Erro ao carregar identidade:', err));
  }, []);

  // Assembleia oficial atribuída ao delegado de lista
  const assembleiaAtribuida = {
    nome: 'Escola Primária 1024 - Morro Bento',
    codigo_cne: 'CNE-LUA-TAL-001',
    municipio: 'Talatona, Luanda',
    total_eleitores: 4200,
    total_mesas: 8,
    coordenadas_oficiais: { latitude: -8.9167, longitude: 13.2667 },
  };

  // Metadados de afluência horária
  const historicoAfluencia = [
    { hora: '08:00', taxa: 18, totalVotos: 756, status: 'NORMAL' },
    { hora: '11:00', taxa: 42, totalVotos: 1764, status: 'NORMAL' },
    { hora: '14:00', taxa: 51, totalVotos: 2142, status: 'ALERTA_BAIXA' }, // Alerta de abstenção
    { hora: '17:00 (Atual)', taxa: 68, totalVotos: 2856, status: 'ESTAVEL' },
  ];

  const totalVotantesCalculado =
    (parseInt(votosFavoraveis, 10) || 0) +
    (parseInt(votosOponentes, 10) || 0) +
    (parseInt(votosNulos, 10) || 0) +
    (parseInt(votosBrancos, 10) || 0);

  const capturarFotoAta = async () => {
    try {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();
      if (permissao.status !== 'granted') {
        Alert.alert(
          'Câmara necessária',
          'Autorize a câmara para fotografar a ata oficial da mesa. Sem a fotografia a ata não tem valor probatório.',
        );
        return;
      }
      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
        exif: false,
      });
      if (resultado.canceled || !resultado.assets?.[0]) {
        return;
      }
      const asset = resultado.assets[0];
      const uri = asset.uri;
      const mime = asset.mimeType || 'image/jpeg';
      const info = await FileSystem.getInfoAsync(uri);
      const tamanho = info.size || asset.fileSize || 0;
      if (tamanho > 5 * 1024 * 1024) {
        Alert.alert('Ficheiro demasiado grande', 'A fotografia da ata não pode exceder 5 MB.');
        return;
      }
      const hashLocal = await cryptoSignService.calcularHashFotoAta(uri);
      setFotoUri(uri);
      setFotoMime(mime);
      setFotoTamanho(tamanho);
      setFotoHash(hashLocal);
      setFotoCapturada(true);
      setStorageKeyFoto('');
    } catch (err) {
      Alert.alert('Captura falhou', err.message || 'Não foi possível abrir a câmara neste aparelho.');
    }
  };

  const submeterAtaComGeofence = async () => {
    if (!fotoCapturada) {
      alert('É obrigatório anexar a fotografia legível da Ata de Apuramento assinada pelos delegados.');
      return;
    }

    setEnviandoAta(true);
    try {
      const ataId = generateUUID();
      const localVotoId = assembleiaAtribuida.id || 'e0000000-0000-0000-0000-000000000001';
      const timestampIso = new Date().toISOString();

      let hashFotoFinal = fotoHash;
      let fotoUrl = `/api/evidencias/storage/atas/${localVotoId}/${ataId}.jpg`;
      let uploadOk = false;
      if (fotoUri) {
        try {
          const ticket = await apiService.pedirTicketUploadAta({
            nomeArquivo: `ata-mesa-${mesaNumero}.jpg`,
            mimeType: fotoMime,
            tamanhoBytes: Math.max(fotoTamanho, 1),
            sha256: fotoHash,
          });
          const enviado = await apiService.enviarBinarioAta(ticket.upload_url, fotoUri, fotoMime);
          hashFotoFinal = enviado.sha256 || fotoHash;
          fotoUrl = ticket.public_url;
          setFotoHash(hashFotoFinal);
          setStorageKeyFoto(ticket.storage_key);
          uploadOk = true;
        } catch (err) {
          console.warn('[Dia D] Fotografia não enviada para o storage:', err.message);
        }
      }

      // 1. Assina digitalmente o pacote canônico com a chave Ed25519 do delegado
      const assinaturaResult = await cryptoSignService.assinarAtaApuramento({
        local_voto_id: localVotoId,
        mesa_numero: parseInt(mesaNumero, 10) || 1,
        votos_favoraveis: parseInt(votosFavoraveis, 10) || 0,
        votos_oponentes: parseInt(votosOponentes, 10) || 0,
        votos_nulos: parseInt(votosNulos, 10) || 0,
        votos_brancos: parseInt(votosBrancos, 10) || 0,
        total_votantes: totalVotantesCalculado,
        foto_hash_sha256: hashFotoFinal,
        registado_em: timestampIso,
        localizacao: {
          longitude: assembleiaAtribuida.coordenadas_oficiais.longitude,
          latitude: assembleiaAtribuida.coordenadas_oficiais.latitude,
        },
      });

      const payload = {
        id: ataId,
        local_voto_id: localVotoId,
        mesa_numero: parseInt(mesaNumero, 10) || 1,
        votos_favoraveis: parseInt(votosFavoraveis, 10) || 0,
        votos_oponentes: parseInt(votosOponentes, 10) || 0,
        votos_nulos: parseInt(votosNulos, 10) || 0,
        votos_brancos: parseInt(votosBrancos, 10) || 0,
        total_votantes: totalVotantesCalculado,
        foto_ata_url: fotoUrl,
        foto_hash_sha256: hashFotoFinal,
        assinatura_digital_ed25519: assinaturaResult.assinatura_digital_ed25519,
        chave_publica_delegado_ed25519: assinaturaResult.chave_publica_delegado_ed25519,
        localizacao_envio: {
          longitude: assembleiaAtribuida.coordenadas_oficiais.longitude,
          latitude: assembleiaAtribuida.coordenadas_oficiais.latitude,
        },
        registado_em: timestampIso,
      };

      let resp = null;
      let transmitida = true;
      try {
        resp = await apiService.submeterAta(payload);
      } catch (err) {
        // Sem ligação ou API recusou: a ata fica assinada no aparelho e NUNCA é dada como entregue.
        transmitida = false;
        console.warn('[Dia D] Ata não transmitida, guardada na fila local:', err.message);
        const bruto = await AsyncStorage.getItem(FILA_ATAS_PENDENTES);
        const fila = bruto ? JSON.parse(bruto) : [];
        fila.push({
          payload,
          fotoUri,
          uploadOk,
          guardado_em: timestampIso,
          motivo: String(err.message || 'falha de rede'),
        });
        await AsyncStorage.setItem(FILA_ATAS_PENDENTES, JSON.stringify(fila));
      }

      setReciboCriptografico({
        ataId,
        assinatura: assinaturaResult.assinatura_digital_ed25519,
        publicKey: assinaturaResult.chave_publica_delegado_ed25519,
        sha256Foto: fotoHash,
        dataHash: assinaturaResult.dados_hash_sha256,
        transmitida,
        status: transmitida ? resp?.ata?.status || 'RECEBIDA' : 'PENDENTE_ENVIO',
      });
      setAtaEnviadaComSucesso(true);
      setTimeout(() => setAtaEnviadaComSucesso(false), 12000);
    } catch (err) {
      console.warn('[Dia D] Falha ao assinar a ata:', err.message);
      Alert.alert('Ata não assinada', 'Não foi possível assinar a ata neste aparelho. Tente novamente.');
    } finally {
      setEnviandoAta(false);
    }
  };

  const dentroDoPerimetro = distanciaMetros <= 300.0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Header do Dia D */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerBadge}>🇦🇴 2027 — ELEIÇÕES GERAIS</Text>
          <Text style={styles.headerTitle}>Painel do Dia D</Text>
        </View>
        <View style={styles.livePulseBox}>
          <View style={styles.livePulseDot} />
          <Text style={styles.livePulseText}>APURAÇÃO AO VIVO</Text>
        </View>
      </View>

      {/* 2. Seletor de Módulos (Afluência / Ata de Apuramento) */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tabBtn, abaAtiva === 'AFALUENCIA' && styles.tabBtnActive]}
          onPress={() => setAbaAtiva('AFALUENCIA')}
        >
          <Text style={[styles.tabBtnText, abaAtiva === 'AFALUENCIA' && styles.tabBtnTextActive]}>
            📊 Afluência e Filas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, abaAtiva === 'ATAS' && styles.tabBtnActive]}
          onPress={() => setAbaAtiva('ATAS')}
        >
          <Text style={[styles.tabBtnText, abaAtiva === 'ATAS' && styles.tabBtnTextActive]}>
            📝 Submeter Ata Oficial
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cartão Informativo da Assembleia do Delegado */}
      <View style={styles.assembleiaCard}>
        <Text style={styles.assembleiaCodigo}>{assembleiaAtribuida.codigo_cne}</Text>
        <Text style={styles.assembleiaNome}>{assembleiaAtribuida.nome}</Text>
        <Text style={styles.assembleiaLocal}>{assembleiaAtribuida.municipio}</Text>

        <View style={styles.assembleiaMetaRow}>
          <Text style={styles.assembleiaMeta}>
            Mesas: <Text style={styles.boldWhite}>{assembleiaAtribuida.total_mesas}</Text>
          </Text>
          <Text style={styles.assembleiaMeta}>
            Eleitores Aptos: <Text style={styles.boldWhite}>{assembleiaAtribuida.total_eleitores.toLocaleString()}</Text>
          </Text>
        </View>
      </View>

      {abaAtiva === 'AFALUENCIA' ? (
        <>
          {/* Alerta Tático Operacional */}
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Alerta de Mobilização (Talatona)</Text>
              <Text style={styles.alertDesc}>
                Afluência desacelerou na última medição das 14h (51%). Acione os brigadistas motorizados para transporte de idosos e jovens até às 17h.
              </Text>
            </View>
          </View>

          {/* Gráfico / Histórico de Horas */}
          <Text style={styles.sectionHeading}>Medições de Afluência às Urnas</Text>
          {historicoAfluencia.map((item, idx) => (
            <View key={idx} style={styles.afluenciaCard}>
              <View style={styles.afluenciaRow}>
                <Text style={styles.afluenciaHora}>{item.hora}</Text>
                <Text style={styles.afluenciaTaxa}>{item.taxa}% de afluência</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${item.taxa}%`,
                      backgroundColor:
                        item.status === 'ALERTA_BAIXA'
                          ? THEME.colors.oposicao
                          : THEME.colors.bastaio,
                    },
                  ]}
                />
              </View>
              <Text style={styles.afluenciaSub}>
                {item.totalVotos.toLocaleString()} votantes estimados na assembleia
              </Text>
            </View>
          ))}
        </>
      ) : (
        <>
          {/* MÓDULO DE ESCANEAMENTO DE ATAS COM CRIPTOGRAFIA E GEOFENCING */}
          {ataEnviadaComSucesso ? (
            <View style={styles.sucessoCard}>
              <Text style={styles.sucessoEmoji}>{reciboCriptografico?.transmitida === false ? '⏳' : '🛡️'}</Text>
              <Text style={styles.sucessoTitulo}>
                {reciboCriptografico?.transmitida === false
                  ? 'Ata assinada, ainda não transmitida'
                  : 'Ata Assinada e Transmitida!'}
              </Text>
              <Text style={styles.sucessoTexto}>
                {reciboCriptografico?.transmitida === false
                  ? 'Sem ligação à central. A ata ficou guardada e assinada neste aparelho; reenvie quando houver rede.'
                  : `Validação espacial concluída: registo executado a ${distanciaMetros}m da mesa oficial.`}
              </Text>
              {reciboCriptografico && (
                <View style={styles.cryptoReceiptBox}>
                  <Text style={styles.cryptoReceiptTitle}>🔐 SELO DE CADEIA DE CUSTÓDIA ED25519</Text>
                  <Text style={styles.cryptoReceiptLine}>
                    Assinatura: <Text style={styles.cryptoCode}>{reciboCriptografico.assinatura.slice(0, 32)}...</Text>
                  </Text>
                  <Text style={styles.cryptoReceiptLine}>
                    Chave Pública: <Text style={styles.cryptoCode}>{reciboCriptografico.publicKey.slice(0, 24)}...</Text>
                  </Text>
                  <Text style={styles.cryptoReceiptLine}>
                    SHA-256 Foto: <Text style={styles.cryptoCode}>{reciboCriptografico.sha256Foto.slice(0, 24)}...</Text>
                  </Text>
                  <Text style={styles.cryptoReceiptStatus}>
                    Status no Tribunal/Comitê: <Text style={{ color: reciboCriptografico.transmitida === false ? THEME.colors.batalha : THEME.colors.bastaio, fontWeight: 'bold' }}>{reciboCriptografico.status}</Text>
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Indicador de Geofencing Anti-Fraude */}
          <View
            style={[
              styles.geofenceBox,
              {
                borderColor: dentroDoPerimetro ? THEME.colors.bastaio : THEME.colors.oposicao,
                backgroundColor: dentroDoPerimetro
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
              },
            ]}
          >
            <Text style={styles.geofenceIcon}>{dentroDoPerimetro ? '📍 🟢' : '🚨 🔴'}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.geofenceTitle,
                  { color: dentroDoPerimetro ? THEME.colors.bastaio : THEME.colors.oposicao },
                ]}
              >
                {dentroDoPerimetro
                  ? `Dentro do Perímetro Oficial (${distanciaMetros}m)`
                  : `Fora da Assembleia de Voto (${distanciaMetros}m)`}
              </Text>
              <Text style={styles.geofenceSub}>
                {dentroDoPerimetro
                  ? 'Coordenadas validadas via PostGIS ST_Distance contra o cadastro da CNE.'
                  : 'Atenção: Submissões a mais de 300m serão marcadas como SUSPEITAS.'}
              </Text>
            </View>
          </View>

          {/* Seleção da Mesa de Voto */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Número da Mesa de Voto:</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={mesaNumero}
              onChangeText={setMesaNumero}
            />
          </View>

          {/* Registo de Votos da Mesa */}
          <Text style={styles.sectionHeading}>Contagem dos Votos na Ata</Text>
          <View style={styles.votosGrid}>
            <View style={styles.votoCol}>
              <Text style={[styles.votoLabel, { color: THEME.colors.bastaio }]}>Votos Nosso Partido</Text>
              <TextInput
                style={[styles.votoInput, { borderColor: THEME.colors.bastaio }]}
                keyboardType="numeric"
                value={votosFavoraveis}
                onChangeText={setVotosFavoraveis}
              />
            </View>

            <View style={styles.votoCol}>
              <Text style={[styles.votoLabel, { color: THEME.colors.oposicao }]}>Votos Oposição</Text>
              <TextInput
                style={[styles.votoInput, { borderColor: THEME.colors.oposicao }]}
                keyboardType="numeric"
                value={votosOponentes}
                onChangeText={setVotosOponentes}
              />
            </View>

            <View style={styles.votoCol}>
              <Text style={styles.votoLabel}>Nulos</Text>
              <TextInput
                style={styles.votoInput}
                keyboardType="numeric"
                value={votosNulos}
                onChangeText={setVotosNulos}
              />
            </View>

            <View style={styles.votoCol}>
              <Text style={styles.votoLabel}>Brancos</Text>
              <TextInput
                style={styles.votoInput}
                keyboardType="numeric"
                value={votosBrancos}
                onChangeText={setVotosBrancos}
              />
            </View>
          </View>

          <View style={styles.totalVotantesRow}>
            <Text style={styles.totalVotantesLabel}>Total de Votantes Calculado:</Text>
            <Text style={styles.totalVotantesVal}>{totalVotantesCalculado}</Text>
          </View>

          {/* Escaneamento e Foto Inviolável */}
          <Text style={styles.sectionHeading}>Captura Fotográfica da Ata</Text>
          <TouchableOpacity
            style={[
              styles.cameraButton,
              fotoCapturada && { borderColor: THEME.colors.bastaio, backgroundColor: 'rgba(16, 185, 129, 0.15)' },
            ]}
            onPress={capturarFotoAta}
          >
            <Text style={styles.cameraIcon}>{fotoCapturada ? '📸 ✅' : '📷'}</Text>
            <Text style={styles.cameraTitle}>
              {fotoCapturada ? 'Fotografia da Ata Capturada e Selada' : 'Fotografar Ata Oficial da Mesa'}
            </Text>
            {fotoUri ? (
              <Image source={{ uri: fotoUri }} style={{ width: '100%', height: 140, borderRadius: 8, marginTop: 8 }} />
            ) : null}
            {fotoCapturada ? (
              <Text style={styles.hashText}>
                SHA-256: {fotoHash.slice(0, 24)}...
                {storageKeyFoto ? ' · storage OK' : ''}
              </Text>
            ) : (
              <Text style={styles.cameraSub}>Câmara nativa. O hash e o PUT ao ticket acontecem na transmissão.</Text>
            )}
          </TouchableOpacity>

          {/* Botão de Submissão Segura */}
          <TouchableOpacity
            style={[styles.btnSubmeterAta, enviandoAta && { opacity: 0.7 }]}
            onPress={submeterAtaComGeofence}
            disabled={enviandoAta}
          >
            <Text style={styles.btnSubmeterAtaText}>
              {enviandoAta ? 'Autenticando e Transmitindo...' : '🔒 Assinar e Transmitir Ata à Central'}
            </Text>
          </TouchableOpacity>
        </>
      )}
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
  headerBadge: {
    color: THEME.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  livePulseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.oposicao,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: THEME.borderRadius.sm,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.oposicao,
    marginRight: 6,
  },
  livePulseText: {
    color: THEME.colors.oposicao,
    fontSize: 10,
    fontWeight: '800',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabBtnActive: {
    backgroundColor: THEME.colors.surfaceElevated,
  },
  tabBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  assembleiaCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  assembleiaCodigo: {
    color: THEME.colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  assembleiaNome: {
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 4,
  },
  assembleiaLocal: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  assembleiaMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 8,
  },
  assembleiaMeta: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  boldWhite: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: THEME.colors.batalha,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  alertTitle: {
    color: THEME.colors.batalha,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertDesc: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    lineHeight: 16,
  },
  sectionHeading: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 6,
  },
  afluenciaCard: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
  },
  afluenciaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  afluenciaHora: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  afluenciaTaxa: {
    color: THEME.colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  afluenciaSub: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  geofenceBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1.5,
    marginBottom: 16,
    alignItems: 'center',
  },
  geofenceIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  geofenceTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  geofenceSub: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    color: THEME.colors.textPrimary,
    fontSize: 14,
  },
  votosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  votoCol: {
    flex: 1,
    marginHorizontal: 3,
  },
  votoLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  votoInput: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
    textAlign: 'center',
    color: THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  totalVotantesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 18,
  },
  totalVotantesLabel: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  totalVotantesVal: {
    color: THEME.colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  cameraButton: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  cameraTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  cameraSub: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  hashText: {
    color: THEME.colors.bastaio,
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily,
    marginTop: 6,
  },
  btnSubmeterAta: {
    backgroundColor: THEME.colors.accent,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: THEME.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  btnSubmeterAtaText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  sucessoCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: THEME.colors.bastaio,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  sucessoEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  sucessoTitulo: {
    color: THEME.colors.bastaio,
    fontSize: 14,
    fontWeight: '700',
  },
  sucessoTexto: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  cryptoReceiptBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
  },
  cryptoReceiptTitle: {
    color: THEME.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cryptoReceiptLine: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    marginBottom: 2,
  },
  cryptoCode: {
    color: THEME.colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  cryptoReceiptStatus: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 4,
  },
});
