import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DatePickerModal } from 'react-native-paper-dates';
import { useFilters } from '../components/FilterContext';
import { colors, fontSizes, radii, spacing } from '../constants/theme';

interface FilterModalProps {
  onClose?: () => void;
}

const sportOptions = [
  { label: 'Any Sport', value: '' },
  { label: 'Basketball', value: 'Basketball' },
  { label: 'Soccer', value: 'Soccer' },
  { label: 'Tennis', value: 'Tennis' },
  { label: 'Yoga', value: 'Yoga' },
  { label: 'HIIT', value: 'HIIT' },
  { label: 'Running', value: 'Running' },
  { label: 'Swimming', value: 'Swimming' },
  { label: 'Golf', value: 'Golf' },
  { label: 'Baseball', value: 'Baseball' },
  { label: 'Volleyball', value: 'Volleyball' },
  { label: 'Other', value: 'Other' },
];

const FilterModal: React.FC<FilterModalProps> = ({ onClose }) => {
  const navigation = useNavigation<any>();
  const { sport: globalSport, date: globalDate, price: globalPrice, radius: globalRadius, setFilters, resetFilters } = useFilters();

  // Local state initialized from global
  const [sport, setSport] = useState(globalSport);
  const [date, setDate] = useState<Date | null>(globalDate ? new Date(globalDate) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [price, setPrice] = useState<'all' | 'free' | 'paid'>(globalPrice);
  const [radius, setRadius] = useState(globalRadius);

  const handleApply = () => {
    setFilters({ sport, date, price, radius });
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  const handleReset = () => {
    setSport('');
    setDate(null);
    setPrice('all');
    setRadius(10);
    resetFilters();
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  const handleDateChange = (params: { date: Date | undefined }) => {
    setShowDatePicker(false);
    if (params.date) {
      setDate(params.date);
    }
  };

  const handleClearDate = () => {
    setDate(new Date());
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Any Date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Modal visible={true} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Filter Events</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Sport Type */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Sport</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={sport}
                onValueChange={setSport}
                style={styles.picker}
              >
                {sportOptions.map(option => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Date */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Date</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
              </TouchableOpacity>
              {date && (
                <TouchableOpacity onPress={handleClearDate} style={{ marginLeft: 8 }}>
                  <Text style={{ color: colors.muted, fontWeight: 'bold' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <DatePickerModal
              locale="en"
              mode="single"
              visible={showDatePicker}
              onDismiss={() => setShowDatePicker(false)}
              date={date || undefined}
              onConfirm={handleDateChange}
              validRange={{ startDate: new Date() }}
            />
          </View>

          {/* Price */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Price</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, price === 'all' && styles.chipActive]}
                onPress={() => setPrice('all')}
              >
                <Text style={[styles.chipText, price === 'all' && styles.chipTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, price === 'free' && styles.chipActive]}
                onPress={() => setPrice('free')}
              >
                <Text style={[styles.chipText, price === 'free' && styles.chipTextActive]}>Free</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, price === 'paid' && styles.chipActive]}
                onPress={() => setPrice('paid')}
              >
                <Text style={[styles.chipText, price === 'paid' && styles.chipTextActive]}>Paid</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Distance */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Distance: {radius} km</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={50}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    alignItems: 'center',
    width: '90%',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.large,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: fontSizes.large,
    color: colors.muted,
    fontWeight: 'bold',
  },
  fieldRow: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
    fontSize: fontSizes.medium,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  picker: {
    width: '100%',
    height: 50,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 60,
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: fontSizes.small,
  },
  chipTextActive: {
    color: '#fff',
  },
  dateButton: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 50,
    justifyContent: 'center',
  },
  dateButtonText: {
    color: colors.text,
    fontSize: fontSizes.medium,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: 12,
  },
  resetButton: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
    minWidth: 0,
  },
  resetButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: fontSizes.medium,
  },
  applyButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: fontSizes.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: fontSizes.large,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalCancel: {
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancelText: {
    fontSize: fontSizes.medium,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  dateTimePicker: {
    width: '100%',
    height: 200,
  },
});

export default FilterModal; 