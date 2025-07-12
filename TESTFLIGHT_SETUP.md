# TestFlight Setup Guide for LivActiv

This guide will walk you through setting up your LivActiv app for TestFlight distribution.

## Prerequisites

1. **Apple Developer Account** ($99/year)
2. **App Store Connect Access**
3. **EAS CLI** installed and logged in
4. **Your app already configured** (✅ Done!)

## Step 1: App Store Connect Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app:
   - Click the "+" button
   - Select "New App"
   - Fill in the details:
     - **Platforms**: iOS
     - **Name**: LivActiv
     - **Bundle ID**: `com.thesushant50.LivActiv` (already configured)
     - **SKU**: `livactiv-ios` (or any unique identifier)
     - **User Access**: Full Access

3. Note down your **App ID** (you'll need this for EAS configuration)

## Step 2: Update EAS Configuration

You need to update the `eas.json` file with your actual Apple credentials:

```json
"testflight": {
  "ios": {
    "appleId": "your-actual-apple-id@example.com",
    "ascAppId": "your-actual-app-store-connect-app-id",
    "appleTeamId": "your-actual-apple-team-id"
  }
}
```

### How to find these values:

- **appleId**: Your Apple Developer account email
- **ascAppId**: Found in App Store Connect → Your App → App Information → Apple ID
- **appleTeamId**: Found in Apple Developer → Membership → Team ID

## Step 3: Build for TestFlight

Run the following command to build your app for TestFlight:

```bash
eas build --platform ios --profile testflight
```

This will:
- Build your app using EAS Build
- Create an iOS archive (.ipa file)
- Upload to App Store Connect

## Step 4: Submit to TestFlight

After the build completes successfully, submit to TestFlight:

```bash
eas submit --platform ios --profile testflight
```

## Step 5: Configure TestFlight

1. Go to App Store Connect → Your App → TestFlight
2. Add testers:
   - **Internal Testers**: People in your development team
   - **External Testers**: Your friends (up to 10,000)

3. For external testers:
   - Add their email addresses
   - They'll receive an email invitation
   - They need to install TestFlight app first
   - Then they can install your app

## Step 6: Invite Your Friend

1. In App Store Connect → TestFlight → External Testers
2. Click "+" to add tester
3. Enter your friend's email address
4. They'll receive an email with instructions

## Troubleshooting

### Common Issues:

1. **Build fails**: Check that all dependencies are compatible
2. **Submission fails**: Verify Apple credentials in `eas.json`
3. **App rejected**: Check App Store Review Guidelines

### Useful Commands:

```bash
# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]

# Update app version
eas build:configure
```

## Next Steps

Once your friend is testing:
1. Monitor crash reports in App Store Connect
2. Collect feedback through TestFlight
3. Fix issues and release updates
4. When ready, submit for App Store review

## Support

- [EAS Documentation](https://docs.expo.dev/eas/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

---

**Note**: Make sure to replace the placeholder values in `eas.json` with your actual Apple Developer credentials before building. 