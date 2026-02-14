import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chatAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatRoom, setChatRoom] = useState<any>(null);

  useEffect(() => {
    loadChat();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const loadChat = async () => {
    try {
      setLoading(true);
      
      // Get chat room info from list
      const roomsResponse = await chatAPI.getChatRooms();
      const room = roomsResponse.data.find((r: any) => r.room_id === id);
      setChatRoom(room);
      
      // Get messages
      await loadMessages();
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await chatAPI.getMessages(id as string);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await chatAPI.sendMessage(id as string, newMessage.trim());
      setNewMessage('');
      await loadMessages();
      flatListRef.current?.scrollToEnd();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.sender_user_id === profile?.user_id;

    return (
      <View
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {item.content}
        </Text>
        <Text
          style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
          ]}
        >
          {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  const otherParticipant = chatRoom?.other_participant;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <View style={styles.headerAvatar}>
                {otherParticipant?.photo ? (
                  <Image source={{ uri: otherParticipant.photo }} style={styles.headerPhoto} />
                ) : (
                  <Ionicons name="person" size={18} color={COLORS.textSecondary} />
                )}
              </View>
              <View>
                <Text style={styles.headerName}>
                  {otherParticipant?.name || otherParticipant?.business_name || 'Chat'}
                </Text>
                {chatRoom?.job && (
                  <Text style={styles.headerJob}>{chatRoom.job.title}</Text>
                )}
              </View>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: COLORS.surface },
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Job Info Banner */}
        {chatRoom?.job && (
          <TouchableOpacity
            style={styles.jobBanner}
            onPress={() => router.push(`/job/${chatRoom.job.job_id}`)}
          >
            <View style={styles.jobBannerContent}>
              <Ionicons name="briefcase" size={18} color={COLORS.primary} />
              <Text style={styles.jobBannerTitle}>{chatRoom.job.title}</Text>
            </View>
            <View style={styles.jobBannerDetails}>
              <Text style={styles.jobBannerRate}>${chatRoom.job.hourly_rate}/hr</Text>
              <Text style={styles.jobBannerStatus}>
                {chatRoom.job.status === 'in_progress' ? 'En progreso' : chatRoom.job.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.message_id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={48} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>Sin mensajes aún</Text>
              <Text style={styles.emptySubtext}>¡Envía el primer mensaje!</Text>
            </View>
          }
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORS.textDisabled}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    marginLeft: SIZES.sm,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  headerPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerJob: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
  },
  jobBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  jobBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobBannerTitle: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  jobBannerDetails: {
    alignItems: 'flex-end',
  },
  jobBannerRate: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.success,
  },
  jobBannerStatus: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
  },
  messagesList: {
    padding: SIZES.md,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusLg,
    marginBottom: SIZES.sm,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    ...SHADOWS.small,
  },
  messageText: {
    fontSize: SIZES.fontMd,
    lineHeight: 22,
  },
  ownMessageText: {
    color: COLORS.white,
  },
  otherMessageText: {
    color: COLORS.textPrimary,
  },
  messageTime: {
    fontSize: SIZES.fontXs,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.xxl * 2,
  },
  emptyText: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLg,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    maxHeight: 100,
    marginRight: SIZES.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
});
