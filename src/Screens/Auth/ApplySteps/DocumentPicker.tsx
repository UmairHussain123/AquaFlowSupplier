import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import {CheckIcon, PlusIcon} from '../../../Component/Icons/TabIcons';

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * One required-document row on SA4. Files are held on the device: the Aquago
 * Supplier API exposes no document-upload endpoint (evidence is collected by
 * ops during verification), so this records what the supplier has ready and
 * shows it back to them.
 */
const DocumentPicker: React.FC<{
  title: string;
  hint: string;
  required?: boolean;
  files: PickedFile[];
  onChange: (files: PickedFile[]) => void;
}> = ({title, hint, required = false, files, onChange}) => {
  const done = files.length > 0;

  const add = async (source: 'camera' | 'library') => {
    const options = {mediaType: 'photo' as const, quality: 0.8 as const};
    const result =
      source === 'camera'
        ? await launchCamera(options)
        : await launchImageLibrary({...options, selectionLimit: 0});

    if (result.didCancel || !result.assets?.length) return;

    const picked = result.assets
      .filter(asset => !!asset.uri)
      .map((asset, index) => ({
        uri: asset.uri as string,
        name: asset.fileName ?? `${title}-${files.length + index + 1}.jpg`,
        type: asset.type ?? 'image/jpeg',
      }));

    onChange([...files, ...picked]);
  };

  return (
    <View style={[styles.card, !done && required && styles.cardRequired]}>
      <View style={styles.head}>
        <View style={[styles.glyph, done && styles.glyphDone]}>
          {done ? (
            <CheckIcon color={Colors.success} size={16} />
          ) : (
            <PlusIcon color={required ? Colors.primary : Colors.textMuted} size={17} />
          )}
        </View>

        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          {done ? (
            <Text style={styles.done}>
              Ready · {files.length} file{files.length === 1 ? '' : 's'}
            </Text>
          ) : (
            <Text style={[styles.hint, required && styles.hintRequired]}>
              {required ? 'Required · ' : ''}
              {hint}
            </Text>
          )}
        </View>

        {done && (
          <TouchableOpacity onPress={() => onChange([])}>
            <Text style={styles.clear}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.pickers}>
        <TouchableOpacity style={styles.picker} onPress={() => add('camera')}>
          <Text style={styles.pickerText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.picker} onPress={() => add('library')}>
          <Text style={styles.pickerText}>Choose file</Text>
        </TouchableOpacity>
      </View>

      {files.map(file => (
        <Text key={file.uri} numberOfLines={1} style={styles.file}>
          {file.name}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 14,
    gap: 11,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 5},
    elevation: 2,
  },
  cardRequired: {borderWidth: 1.5, borderColor: Colors.primary},
  head: {flexDirection: 'row', alignItems: 'center', gap: 12},
  glyph: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphDone: {backgroundColor: Colors.successBg},
  titles: {flex: 1},
  title: {fontSize: 14.5, fontWeight: '800', color: Colors.text},
  done: {fontSize: 11.5, color: Colors.success, fontWeight: '700', marginTop: 2},
  hint: {fontSize: 11.5, color: Colors.textSecondary, marginTop: 2},
  hintRequired: {color: Colors.danger, fontWeight: '700'},
  clear: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
  pickers: {flexDirection: 'row', gap: 9},
  picker: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderDashed,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerText: {fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary},
  file: {fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted},
});

export default DocumentPicker;
