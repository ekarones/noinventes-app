import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sendChatMessage, type ChatHistoryItem } from '../api/chat';
import { ApiError } from '../api/client';
import type { Palette } from '../theme/colors';
import { useTheme, useThemedStyles } from '../theme/theme';
import { FONT_FAMILY, ROW_PRESS_OPACITY } from '../theme/tokens';

// Floating chat button + a bottom-sheet chat panel over a dark dim, wired to the
// backend assistant (POST /api/mobile/chat). Messages are kept in memory while
// the app is open; there's no history persistence (matches the web assistant).
type ChatMsg = { id: string; text: string; from: 'bot' | 'me' };

const GREETING = '¡Hola! 👋 Soy el asistente de No inventes. ¿En qué te puedo ayudar?';

// Suggestions common to both roles (admin-only intents aren't offered here).
const SUGGESTIONS = [
  '¿Cuánto vendí hoy?',
  'Productos más vendidos',
  'Últimas ventas',
  '¿Cuánto cobré con Yape?',
];

// Renders **bold** spans inside a chat bubble; everything else stays plain text
// (newlines render as line breaks). Avoids pulling a markdown dependency for the
// only markup the assistant emits.
function renderRich(text: string, boldStyle: object) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={boldStyle}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default function ChatFab() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([{ id: 'greet', text: GREETING, from: 'bot' }]);
  const [sending, setSending] = useState(false);
  // Keyboard height, to lift the sheet above it (the modal is edge-to-edge).
  const [kbHeight, setKbHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const idRef = useRef(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKbHeight(e.endCoordinates?.height ?? 0)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const keyboardUp = kbHeight > 0;

  function nextId() {
    idRef.current += 1;
    return `m${idRef.current}`;
  }

  async function send(preset?: string) {
    const t = (preset ?? text).trim();
    if (!t || sending) return;
    if (!preset) setText('');
    // Prior turns as context (drop the canned greeting; map to the API's shape).
    const history: ChatHistoryItem[] = messages
      .filter((m) => m.id !== 'greet')
      .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text }));
    setMessages((prev) => [...prev, { id: nextId(), text: t, from: 'me' }]);
    setSending(true);
    try {
      const reply = await sendChatMessage(t, history);
      setMessages((prev) => [...prev, { id: nextId(), text: reply.answer, from: 'bot' }]);
    } catch (e) {
      // 401 signs out globally (handled in the API client) — just stop here.
      if (e instanceof ApiError && e.status === 401) return;
      let msg = 'Ocurrió un error. Probá de nuevo en un momento.';
      if (e instanceof ApiError) {
        if (e.status === 429) msg = 'Estás enviando mensajes muy rápido. Esperá unos segundos e intentá de nuevo.';
        else if (e.status === 503) msg = 'El asistente no está disponible ahora. Probá en un momento.';
        else msg = e.message;
      }
      setMessages((prev) => [...prev, { id: nextId(), text: msg, from: 'bot' }]);
    } finally {
      setSending(false);
    }
  }

  const onlyGreeting = messages.length === 1;

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 72 }]}
        onPress={() => setOpen(true)}
        activeOpacity={ROW_PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel="Abrir chat"
      >
        <Ionicons name="chatbubble-ellipses" size={25} color={colors.onChrome} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        {/* Full-screen dark dim; the sheet is anchored to the bottom and lifted
            above the keyboard. The reported keyboard height excludes the system
            nav bar on this edge-to-edge modal, so add the bottom inset. */}
        <View style={[styles.backdrop, { paddingBottom: kbHeight > 0 ? kbHeight + insets.bottom : 0 }]}>
          {/* Tap the dim above the sheet to close. */}
          <Pressable style={styles.dimTap} onPress={() => setOpen(false)} accessibilityLabel="Cerrar chat" />

          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Ionicons name="chatbubble-ellipses" size={18} color={colors.onChrome} />
              </View>
              <View style={styles.headerTexts}>
                <Text style={styles.headerTitle}>Chat de soporte</Text>
                <Text style={styles.headerSub}>Asistente de No inventes</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Thread */}
            <ScrollView
              ref={scrollRef}
              style={styles.thread}
              contentContainerStyle={styles.threadContent}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[styles.bubble, m.from === 'me' ? styles.bubbleMe : styles.bubbleBot]}
                >
                  <Text style={[styles.bubbleText, m.from === 'me' && styles.bubbleTextMe]}>
                    {m.from === 'bot' ? renderRich(m.text, styles.bold) : m.text}
                  </Text>
                </View>
              ))}

              {sending && (
                <View style={[styles.bubble, styles.bubbleBot]}>
                  <Text style={styles.typing}>●  ●  ●</Text>
                </View>
              )}

              {onlyGreeting && !sending && (
                <View style={styles.chips}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.chip}
                      onPress={() => send(s)}
                      activeOpacity={ROW_PRESS_OPACITY}
                      accessibilityRole="button"
                    >
                      <Text style={styles.chipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={[styles.inputRow, { paddingBottom: keyboardUp ? 8 : insets.bottom + 6 }]}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Escribe un mensaje…"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnOff]}
                onPress={() => send()}
                disabled={!text.trim() || sending}
                activeOpacity={ROW_PRESS_OPACITY}
                accessibilityLabel="Enviar"
              >
                <Ionicons name="send" size={17} color={colors.onChrome} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      right: 18,
      width: 58,
      height: 58,
      borderRadius: 999,
      backgroundColor: colors.chromeFill,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#16213a',
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },

    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22, 33, 58, 0.45)' },
    dimTap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    sheet: {
      height: '80%',
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 999,
      backgroundColor: colors.chromeFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTexts: { flex: 1, minWidth: 0 },
    headerTitle: { fontSize: 15.5, fontFamily: FONT_FAMILY.black, color: colors.primary },
    headerSub: { fontSize: 11.5, fontFamily: FONT_FAMILY.bold, color: colors.textSecondary, marginTop: 1 },

    thread: { flex: 1 },
    threadContent: { padding: 16, gap: 8 },
    bubble: { maxWidth: '82%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 13 },
    bubbleBot: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 5 },
    bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.chromeFill, borderBottomRightRadius: 5 },
    bubbleText: { fontSize: 14, fontFamily: FONT_FAMILY.medium, color: colors.primary, lineHeight: 19 },
    bubbleTextMe: { color: colors.onChrome },
    bold: { fontFamily: FONT_FAMILY.black, color: colors.primary },
    typing: { fontSize: 10, color: colors.textSecondary, letterSpacing: 1 },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: {
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 14,
    },
    chipText: { fontSize: 12.5, fontFamily: FONT_FAMILY.bold, color: colors.primary },

    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
    input: {
      flex: 1,
      maxHeight: 110,
      minHeight: 44,
      paddingHorizontal: 14,
      paddingTop: 11,
      paddingBottom: 11,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      borderRadius: 18,
      fontSize: 15,
      fontFamily: FONT_FAMILY.medium,
      color: colors.primary,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 999,
      backgroundColor: colors.chromeFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnOff: { opacity: 0.45 },
  });
