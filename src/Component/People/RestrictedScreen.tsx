import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import AppHeader from '../Common/AppHeader';
import Card from '../Common/Card';
import EmptyState from '../Common/EmptyState';

/**
 * Stands in for a screen the signed-in role can't use — or one that needs a
 * shop when none is linked — so the user reads why instead of hitting a 403.
 */
const RestrictedScreen: React.FC<{
  title: string;
  heading: string;
  message: string;
}> = ({title, heading, message}) => (
  <View style={styles.screen}>
    <AppHeader title={title} />
    <View style={styles.body}>
      <Card>
        <EmptyState title={heading} message={message} />
      </Card>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  body: {padding: 20},
});

export default RestrictedScreen;
