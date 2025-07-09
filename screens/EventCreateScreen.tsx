import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Image, Modal, PixelRatio, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import { auth, db, storage } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';

const EventCreateScreen: React.FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('Free');
  const [capacity, setCapacity] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [date, setDate] = useState<Date | null>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    return tomorrow;
  });
  const [time, setTime] = useState<{ hours: number; minutes: number } | null>(null);
  const [eventImage, setEventImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [indoorOutdoor, setIndoorOutdoor] = useState<'indoor' | 'outdoor'>('outdoor');
  const [autoApprove, setAutoApprove] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showIndoorModal, setShowIndoorModal] = useState(false);

  const { width } = useWindowDimensions();
  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const styles = getStyles({ scaleSize, scaleFont, width });

  const sportTypes = [
    'Basketball', 'Soccer', 'Tennis', 'Yoga', 'HIIT', 'Running', 
    'Swimming', 'Golf', 'Baseball', 'Volleyball', 'Other'
  ];

  const priceOptions = ['Free', 'Paid'];
  const indoorOptions = ['indoor', 'outdoor'];

  const handleImagePick = async () => {
    try {
      Alert.alert(
        'Select Image',
        'Choose how you want to add an image',
        [
          {
            text: 'Camera',
            onPress: () => handleCameraCapture(),
          },
          {
            text: 'Photo Library',
            onPress: () => handlePhotoLibrary(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error showing image picker options:', error);
      // Fallback to photo library
      handlePhotoLibrary();
    }
  };

  const handleCameraCapture = async () => {
    console.log('Camera capture initiated');
    setImageLoading(true);
    
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos!');
        return;
      }
      
      console.log('Launching camera...');
      const result = await ImagePicker.launchCameraAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: [4, 3], 
        quality: 0.7 
      });
      
      console.log('Camera result:', result);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Setting image URI:', result.assets[0].uri);
        setEventImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    } finally {
      setImageLoading(false);
    }
  };

  const handlePhotoLibrary = async () => {
    console.log('Photo library initiated');
    setImageLoading(true);
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Media library permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Permission to access media library is required!');
        return;
      }
      
      console.log('Launching photo library...');
      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: [4, 3], 
        quality: 0.7 
      });
      
      console.log('Photo library result:', result);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Setting image URI:', result.assets[0].uri);
        setEventImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Photo library error:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleLocationPick = () => {
    // For now, use a default location (Phoenix, AZ)
    setLocation({
      latitude: 33.4484,
      longitude: -112.0740,
      address: 'Phoenix, AZ'
    });
    setShowLocationPicker(false);
  };

  const handleDateChange = (params: { date: Date | undefined }) => {
    setShowDatePicker(false);
    if (params.date) {
      setDate(params.date);
    }
  };

  const handleClearDate = () => {
    setDate(null);
  };

  const handleTimeChange = ({ hours, minutes }: { hours: number; minutes: number }) => {
    setShowTimePicker(false);
    setTime({ hours, minutes });
  };

  const handleClearTime = () => {
    setTime(null);
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return false;
    }
    if (!type) {
      Alert.alert('Error', 'Please select a sport type');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter an event description');
      return false;
    }
    if (!capacity || parseInt(capacity) <= 0) {
      Alert.alert('Error', 'Please enter a valid capacity');
      return false;
    }
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      Alert.alert('Error', 'Please select a valid location on the map');
      return false;
    }
    if (!date || date <= new Date()) {
      Alert.alert('Error', 'Event date must be in the future');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      let imageUrl = '';
      if (eventImage) {
        try {
          // Check authentication first
          if (!auth.currentUser) {
            throw new Error('User not authenticated');
          }
          
          console.log('Starting image upload for:', eventImage);
          console.log('User authenticated:', auth.currentUser.uid);
          console.log('Storage bucket:', storage.app.options.storageBucket);
          
          const response = await fetch(eventImage);
          console.log('Fetch response status:', response.status);
          
          if (!response.ok) {
            throw new Error('Failed to fetch image for upload. Status: ' + response.status);
          }
          
          const blob = await response.blob();
          console.log('Blob created, size:', blob.size);
          
          // const storageRef = ref(storage, `eventImages/${Date.now()}_${auth.currentUser?.uid}`);
          // console.log('Uploading to storage ref:', storageRef.fullPath);
          
          // await uploadBytes(storageRef, blob);
          // console.log('Upload completed, getting download URL...');
          
          // imageUrl = await getDownloadURL(storageRef);
          // console.log('Download URL obtained:', imageUrl);
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          if (uploadError && typeof uploadError === 'object') {
            console.error('Error details:', {
              code: (uploadError as any).code,
              message: (uploadError as any).message,
              stack: (uploadError as any).stack
            });
            console.log('Error details:', {
              code: (uploadError as any).code,
              message: (uploadError as any).message,
              stack: (uploadError as any).stack
            });
          } else {
            console.error('Error details:', uploadError);
          }

          let errorMessage = 'Could not upload event image. Please try a different image or check your network connection.';

          // Ensure uploadError is an object and has a 'code' property before accessing it
          const errorCode = (uploadError && typeof uploadError === 'object' && 'code' in uploadError)
            ? (uploadError as any).code
            : undefined;

          if (errorCode === 'storage/unauthorized') {
            errorMessage = 'Upload failed: You are not authorized to upload images. Please check your account permissions.';
          } else if (errorCode === 'storage/quota-exceeded') {
            errorMessage = 'Upload failed: Storage quota exceeded. Please try a smaller image or contact support.';
          } else if (errorCode === 'storage/unauthenticated') {
            errorMessage = 'Upload failed: Please sign in again to upload images.';
          } else if (errorCode === 'storage/unknown') {
            errorMessage = 'Upload failed: Network or configuration issue. Please check your internet connection and try again.';
          }
          
          Alert.alert('Image Upload Failed', errorMessage);
          setLoading(false);
          return;
        }
      }

      let combinedDate = date ? new Date(date) : new Date();
      if (combinedDate && time) {
        combinedDate.setHours(time.hours, time.minutes, 0, 0);
      }

      const eventData = {
        title: title.trim(),
        type,
        description: description.trim(),
        price,
        maxCapacity: parseInt(capacity),
        latitude: location.latitude,
        longitude: location.longitude,
        location: location.address,
        date: Timestamp.fromDate(combinedDate),
        organizer: auth.currentUser?.uid || '',
        organizerName: auth.currentUser?.displayName || 'Unknown',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        // image: imageUrl,
        indoorOutdoor,
        autoApprove,
        currentAttendees: 0,
        status: 'active',
        expiresAt: Timestamp.fromDate(combinedDate),
      };
      console.log('Creating event with data:', eventData);
      await addDoc(collection(db, 'events'), eventData);
      
      Alert.alert('Success', 'Event created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setTitle('');
            setType('');
            setDescription('');
            setPrice('Free');
            setCapacity('');
            setLocation(null);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(12, 0, 0, 0);
            setDate(tomorrow);
            setTime(null);
            setEventImage(null);
            setIndoorOutdoor('outdoor');
            setAutoApprove(false);
            
            if (onCreated) onCreated();
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Any Date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: { hours: number; minutes: number } | null) => {
    if (!time) return 'Any Time';
    const h = time.hours.toString().padStart(2, '0');
    const m = time.minutes.toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onCreated?.()}>
          <Ionicons name="close" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <TouchableOpacity 
          style={[styles.createButton, loading && styles.createButtonDisabled]} 
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Image */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Event Image</Text>
          <TouchableOpacity 
            style={[styles.imagePicker, imageLoading && styles.imagePickerLoading]} 
            onPress={handleImagePick}
            disabled={imageLoading}
          >
            {eventImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: eventImage }} style={styles.selectedImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setEventImage(null);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : imageLoading ? (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="hourglass-outline" size={32} color={colors.muted} />
                <Text style={styles.imagePlaceholderText}>Loading...</Text>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={32} color={colors.muted} />
                <Text style={styles.imagePlaceholderText}>Tap to Add Event Image</Text>
                <Text style={styles.imagePlaceholderSubtext}>Camera or Photo Library</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Event Title"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <TouchableOpacity 
            style={styles.pickerButton} 
            onPress={() => setShowTypeModal(true)}
          >
            <Text style={styles.pickerButtonText}>
              {type || 'Select Sport Type'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.muted} />
          </TouchableOpacity>

          <TextInput
            style={styles.textArea}
            placeholder="Event Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Event Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          
          <TouchableOpacity 
            style={styles.pickerButton} 
            onPress={() => setShowIndoorModal(true)}
          >
            <Text style={styles.pickerButtonText}>
              {indoorOutdoor === 'indoor' ? 'Indoor' : 'Outdoor'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.muted} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Max Capacity"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="numeric"
          />

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

          {/* Time */}
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Time</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.dateButtonText}>{formatTime(time)}</Text>
              </TouchableOpacity>
              {time && (
                <TouchableOpacity onPress={handleClearTime} style={{ marginLeft: 8 }}>
                  <Text style={{ color: colors.muted, fontWeight: 'bold' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <TimePickerModal
              visible={showTimePicker}
              onDismiss={() => setShowTimePicker(false)}
              onConfirm={handleTimeChange}
              hours={time ? time.hours : new Date().getHours()}
              minutes={time ? time.minutes : new Date().getMinutes()}
              label="Pick time"
              cancelLabel="Cancel"
              confirmLabel="Ok"
              animationType="fade"
              locale="en"
            />
          </View>

          <TouchableOpacity 
            style={styles.pickerButton} 
            onPress={() => setShowLocationPicker(true)}
          >
            <Text style={styles.pickerButtonText}>
              {location ? location.address : 'Select Location'}
            </Text>
            <Ionicons name="location-outline" size={20} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.pickerButton} 
            onPress={() => setShowPriceModal(true)}
          >
            <Text style={styles.pickerButtonText}>
              {price}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => setAutoApprove(!autoApprove)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Auto-approve bookings</Text>
              <Text style={styles.settingDescription}>
                Automatically approve bookings without manual review
              </Text>
            </View>
            <View style={[styles.toggle, autoApprove && styles.toggleActive]}>
              {/* Always render the toggle background, only show dot if on */}
              {autoApprove ? <View style={styles.toggleDot} /> : null}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      {/* Sport Type Modal */}
      <Modal visible={showTypeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Sport Type</Text>
            {sportTypes.map((sport) => (
              <TouchableOpacity
                key={sport}
                style={styles.modalOption}
                onPress={() => {
                  setType(sport);
                  setShowTypeModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{sport}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowTypeModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Price Modal */}
      <Modal visible={showPriceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Price</Text>
            {priceOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => {
                  setPrice(option);
                  setShowPriceModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowPriceModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Indoor/Outdoor Modal */}
      <Modal visible={showIndoorModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location Type</Text>
            {indoorOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOption}
                onPress={() => {
                  setIndoorOutdoor(option as 'indoor' | 'outdoor');
                  setShowIndoorModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>
                  {option === 'indoor' ? 'Indoor' : 'Outdoor'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowIndoorModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal visible={showLocationPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <Text style={styles.modalDescription}>
              Choose a city for your event location.
            </Text>
            {[
              { address: 'Phoenix, AZ', latitude: 33.4484, longitude: -112.0740 },
              { address: 'New York, NY', latitude: 40.7128, longitude: -74.0060 },
              { address: 'Los Angeles, CA', latitude: 34.0522, longitude: -118.2437 },
              { address: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298 },
              { address: 'Houston, TX', latitude: 29.7604, longitude: -95.3698 },
              { address: 'Miami, FL', latitude: 25.7617, longitude: -80.1918 },
              { address: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194 },
              { address: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321 },
              { address: 'Boston, MA', latitude: 42.3601, longitude: -71.0589 },
              { address: 'Dallas, TX', latitude: 32.7767, longitude: -96.7970 },
              { address: 'Atlanta, GA', latitude: 33.7490, longitude: -84.3880 },
            ].map((city) => (
              <TouchableOpacity
                key={city.address}
                style={styles.modalOption}
                onPress={() => {
                  setLocation({
                    latitude: city.latitude,
                    longitude: city.longitude,
                    address: city.address
                  });
                  setShowLocationPicker(false);
                }}
              >
                <Text style={styles.modalOptionText}>{city.address}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowLocationPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Responsive styles factory
const getStyles = ({ scaleSize, scaleFont, width }: { scaleSize: (n: number) => number, scaleFont: (n: number) => number, width: number }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scaleSize(spacing.md),
    paddingTop: scaleSize(spacing.lg),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.primary,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scaleSize(spacing.lg),
    paddingVertical: scaleSize(spacing.sm),
    borderRadius: scaleSize(radii.md),
  },
  createButtonDisabled: {
    backgroundColor: colors.muted,
  },
  createButtonText: {
    color: '#fff',
    fontSize: scaleFont(fontSizes.medium),
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: scaleSize(spacing.md),
  },
  section: {
    marginBottom: scaleSize(spacing.xl),
  },
  sectionTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: scaleSize(spacing.md),
  },
  imageSection: {
    marginBottom: scaleSize(spacing.xl),
  },
  imagePicker: {
    width: '100%',
    height: scaleSize(200),
    borderRadius: scaleSize(radii.lg),
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: scaleSize(2),
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  imagePickerLoading: {
    opacity: 0.6,
  },
  selectedImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: scaleSize(spacing.sm),
    right: scaleSize(spacing.sm),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: scaleSize(12),
    padding: scaleSize(2),
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: scaleSize(spacing.sm),
    fontSize: scaleFont(fontSizes.medium),
    color: colors.muted,
    textAlign: 'center',
  },
  imagePlaceholderSubtext: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: scaleSize(spacing.xs),
  },
  input: {
    borderWidth: scaleSize(1),
    borderColor: colors.border,
    borderRadius: scaleSize(radii.md),
    padding: scaleSize(spacing.md),
    fontSize: scaleFont(fontSizes.regular),
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: scaleSize(spacing.md),
  },
  textArea: {
    borderWidth: scaleSize(1),
    borderColor: colors.border,
    borderRadius: scaleSize(radii.md),
    padding: scaleSize(spacing.md),
    fontSize: scaleFont(fontSizes.regular),
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: scaleSize(spacing.sm),
    minHeight: scaleSize(100),
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.muted,
    textAlign: 'right',
    marginBottom: scaleSize(spacing.md),
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: scaleSize(1),
    borderColor: colors.border,
    borderRadius: scaleSize(radii.md),
    padding: scaleSize(spacing.md),
    backgroundColor: colors.card,
    marginBottom: scaleSize(spacing.md),
    minHeight: scaleSize(44),
  },
  pickerButtonText: {
    fontSize: scaleFont(fontSizes.regular),
    color: colors.text,
    flex: 1,
    flexShrink: 1,
    flexWrap: 'nowrap',
    textAlign: 'left',
    marginRight: scaleSize(8),
    includeFontPadding: false,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleSize(spacing.sm),
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: scaleFont(fontSizes.medium),
    fontWeight: '600',
    color: colors.text,
    marginBottom: scaleSize(spacing.xs),
  },
  settingDescription: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
  },
  toggle: {
    width: scaleSize(44),
    height: scaleSize(24),
    borderRadius: scaleSize(12),
    backgroundColor: colors.border,
    padding: scaleSize(2),
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleDot: {
    width: scaleSize(20),
    height: scaleSize(20),
    borderRadius: scaleSize(10),
    backgroundColor: '#fff',
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: scaleSize(radii.lg),
    padding: scaleSize(spacing.lg),
    width: '80%',
    maxWidth: scaleSize(300),
  },
  modalTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: scaleSize(spacing.md),
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: scaleSize(spacing.md),
    lineHeight: scaleFont(18),
  },
  modalOption: {
    paddingVertical: scaleSize(spacing.md),
    borderBottomWidth: scaleSize(1),
    borderBottomColor: colors.border,
  },
  modalOptionText: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.text,
    textAlign: 'center',
  },
  modalCancel: {
    paddingVertical: scaleSize(spacing.md),
    marginTop: scaleSize(spacing.sm),
  },
  modalCancelText: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  fieldRow: {
    width: '100%',
    marginBottom: scaleSize(spacing.md),
  },
  label: {
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: scaleSize(spacing.xs),
    fontSize: scaleFont(fontSizes.medium),
  },
  dateButton: {
    backgroundColor: colors.background,
    borderRadius: scaleSize(radii.md),
    padding: scaleSize(spacing.md),
    alignItems: 'center',
    borderWidth: scaleSize(1),
    borderColor: colors.border,
    minHeight: scaleSize(50),
    justifyContent: 'center',
  },
  dateButtonText: {
    color: colors.text,
    fontSize: scaleFont(fontSizes.medium),
    fontWeight: '500',
  },
});

export default EventCreateScreen; 