import React from 'react';
import {ActivityIndicator, Modal, StyleSheet, Text, View} from 'react-native';
import {useSelector} from 'react-redux';
import {Colors} from '../../Constant/Colors';
import {selectLoading} from '../../Redux/slices/loadingSlice';

/** App-wide blocking spinner, driven by the `loading` slice. */
const GlobalLoader: React.FC = () => {
  const {visible, message} = useSelector(selectLoading);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <ActivityIndicator color={Colors.primary} size="large" />
          {!!message && <Text style={styles.text}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: 34,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 12,
  },
  text: {fontSize: 13, fontWeight: '600', color: Colors.text},
});

export default GlobalLoader;
