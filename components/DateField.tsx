import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Text, View } from '@/components/Themed';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
};

export default function DateField({ label, value, onChange }: Props) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setShow(true)}>
        <Text style={styles.value}>
          {value.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={(_event, selectedDate) => {
            if (Platform.OS === 'android') setShow(false);
            if (selectedDate) onChange(selectedDate);
          }}
          onDismiss={() => setShow(false)}
        />
      )}
      {show && Platform.OS === 'ios' && (
        <Pressable style={styles.doneButton} onPress={() => setShow(false)}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  field: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
  },
  value: {
    fontSize: 15,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  doneText: {
    fontWeight: '600',
  },
});
