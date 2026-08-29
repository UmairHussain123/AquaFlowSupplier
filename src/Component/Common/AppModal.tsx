import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from '../../Constant/Colors';

/** The bottom sheet the portal's modals become on mobile. */
const AppModal: React.FC<{
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({visible, title, subtitle, onClose, children, footer}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>

        {!!footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const styles = StyleSheet.create({
  flex: {flex: 1, justifyContent: 'flex-end'},
  backdrop: {...StyleSheet.absoluteFill, backgroundColor: Colors.overlay},
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
  },
  grabber: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderIdle,
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerText: {flex: 1},
  title: {fontSize: 17, fontWeight: '800', color: Colors.text},
  subtitle: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  close: {fontSize: 13, fontWeight: '800', color: Colors.primary},
  body: {paddingHorizontal: 20, paddingBottom: 18, gap: 13},
  footer: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
});

export default AppModal;
