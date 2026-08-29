import React, {useCallback, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import EmptyState from '../../../Component/Common/EmptyState';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {formatShortDateTime} from '../../../helper/dateHelper';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  listOrderMessages,
  messageSenderLabel,
  sendOrderMessage,
} from '../../../Server/Order/OrdersApi';
import type {OrderMessage} from '../../../Server/Order/OrderType';

/** The order thread — GET/POST /supplier/shops/{shop}/orders/{id}/messages. */
const OrderMessagesScreen: React.FC<{route: any}> = ({route}) => {
  const shopId = useActiveShopId();
  const orderId = route?.params?.orderId;
  const listRef = useRef<FlatList<OrderMessage>>(null);

  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!shopId || !orderId) return;
    try {
      setMessages(await listOrderMessages(shopId, orderId));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not load the thread.'),
      });
    } finally {
      setLoading(false);
    }
  }, [orderId, shopId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const send = async () => {
    const text = draft.trim();
    if (!text || !shopId) return;

    setSending(true);
    try {
      const message = await sendOrderMessage(shopId, orderId, text);
      setMessages(prev => [...prev, message]);
      setDraft('');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({animated: true}));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not send the message.'),
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <ScreenLoader />;

  return (
    <View style={styles.screen}>
      <AppHeader title="Order messages" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
        style={styles.flex}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.body}
          renderItem={({item}) => (
            <View style={styles.bubble}>
              <Text style={styles.sender}>{messageSenderLabel(item)}</Text>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>
                {formatShortDateTime(item.created_at)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No messages yet"
              message="Anything you send here reaches the customer inside their order."
            />
          }
        />

        <View style={styles.composer}>
          <AppInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message…"
            style={styles.flex}
          />
          <AppButton
            title="Send"
            onPress={send}
            loading={sending}
            disabled={!draft.trim()}
            block={false}
            small
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 10},
  bubble: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 13,
    gap: 4,
  },
  sender: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  message: {fontSize: 13.5, color: Colors.text, lineHeight: 20},
  time: {fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted},

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 14,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
});

export default OrderMessagesScreen;
