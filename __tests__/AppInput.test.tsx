/**
 * @format
 */

import React from 'react';
import {TextInput} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {useFormik} from 'formik';

import AppInput from '../src/Component/Common/AppInput';

/**
 * Formik's handleBlur is written for the DOM — it destructures
 * event.target.{name,id}. React Native's blur event has no such target, so
 * AppInput hands it a stand-in. Without that, blurring any field in the app
 * crashed with "Cannot read property 'persist' of undefined".
 */
const Harness: React.FC<{onTouched: (touched: any) => void}> = ({onTouched}) => {
  const formik = useFormik({
    initialValues: {email: ''},
    onSubmit: () => {},
  });

  onTouched(formik.touched);

  return (
    <AppInput
      label="Email"
      value={formik.values.email}
      onChangeText={formik.handleChange('email')}
      onBlur={formik.handleBlur('email')}
    />
  );
};

test('blurring a formik-wired input marks the field touched instead of crashing', async () => {
  let touched: any = {};
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <Harness
        onTouched={next => {
          touched = next;
        }}
      />,
    );
  });

  const input = tree!.root.findByType(TextInput);

  await ReactTestRenderer.act(() => {
    input.props.onBlur();
  });

  expect(touched.email).toBe(true);
});
