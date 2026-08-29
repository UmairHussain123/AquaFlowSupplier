import React from 'react';
import {StackActions} from '@react-navigation/native';

export const navigationRef: any = React.createRef();

let isNavigationReady = false;
const pendingNavigationQueue: Array<{
  name: string;
  params?: any;
  type?: 'navigate' | 'replace';
}> = [];

const flushPendingNavigationQueue = () => {
  if (!isNavigationReady || !navigationRef.current) return;

  while (pendingNavigationQueue.length > 0) {
    const next = pendingNavigationQueue.shift();
    if (!next) continue;

    if (next.type === 'replace' && navigationRef.current?.dispatch) {
      navigationRef.current.dispatch(StackActions.replace(next.name, next.params));
      continue;
    }

    navigationRef.current.navigate(next.name, next.params);
  }
};

export function setNavigationReady(value: boolean) {
  isNavigationReady = value;
  if (value) flushPendingNavigationQueue();
}

export function navigate(name: string, params?: any) {
  if (isNavigationReady && navigationRef.current) {
    navigationRef.current.navigate(name, params);
    return true;
  }
  pendingNavigationQueue.push({name, params, type: 'navigate'});
  return false;
}

export function replace(name: string, params?: any) {
  if (isNavigationReady && navigationRef.current?.dispatch) {
    navigationRef.current.dispatch(StackActions.replace(name, params));
    return true;
  }
  pendingNavigationQueue.push({name, params, type: 'replace'});
  return false;
}

export function resetTo(name: string, params?: any) {
  if (isNavigationReady && navigationRef.current?.reset) {
    navigationRef.current.reset({index: 0, routes: [{name, params}]});
    return true;
  }
  pendingNavigationQueue.push({name, params, type: 'replace'});
  return false;
}

export function goBack() {
  if (isNavigationReady && navigationRef.current?.canGoBack?.()) {
    navigationRef.current.goBack();
    return true;
  }
  return false;
}
