# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# LivActiv

A React Native app for discovering and joining local sports activities.

## Recent Fixes

### Date Selection Issue (Fixed)
- **Problem**: Users were unable to select dates in the filter modal and event creation screen
- **Root Cause**: 
  - Custom date picker in FilterModal was using wrong state variables (`selectedDay/Month/Year` instead of `tempDay/Month/Year`)
  - DateTimePicker was being rendered outside the modal on Android, causing compatibility issues
  - Missing proper platform-specific handling for Android vs iOS
- **Solution**:
  - Fixed custom date picker to use correct temp state variables
  - Added proper platform-specific DateTimePicker rendering
  - Improved date/time initialization to start with valid future dates
  - Added better error handling for date selection cancellation
  - Enhanced date validation and edge case handling

### Technical Details
- **FilterModal**: Fixed custom date picker state management and added platform-specific DateTimePicker rendering
- **EventCreateScreen**: Improved DateTimePicker implementation with better Android/iOS compatibility
- **Date Validation**: Added proper future date validation and initialization
- **Platform Support**: Enhanced cross-platform compatibility for date/time selection

## Features

- User authentication and profile management
- Event discovery and filtering
- Event creation for trainers
- Real-time chat functionality
- Location-based event search
- Payment integration with Stripe
- Push notifications
- Responsive design for tablets and phones

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your preferred platform:
```bash
npm run android
npm run ios
npm run web
```

## Dependencies

- React Native 0.79.4
- Expo SDK 53
- Firebase for backend services
- Stripe for payments
- React Navigation for routing
- DateTimePicker for date/time selection

## Platform Support

- iOS
- Android
- Web (limited functionality)

## Troubleshooting

### Date Selection Issues
If you experience issues with date selection:
1. Ensure you're using the latest version of `@react-native-community/datetimepicker`
2. Check that the device/emulator has the correct date/time settings
3. For Android, ensure the app has proper permissions
4. Try clearing the app cache and restarting

### Common Issues
- **Metro bundler issues**: Clear cache with `npx expo start --clear`
- **iOS build issues**: Clean build folder in Xcode
- **Android build issues**: Clean project with `cd android && ./gradlew clean`
