# 🚀 TestFlight Quick Start Guide

## Prerequisites Checklist

- [ ] Apple Developer Account ($99/year)
- [ ] App Store Connect Access
- [ ] EAS CLI installed ✅
- [ ] Logged in to Expo ✅

## Step 1: Set Up Environment Variables

Run the setup script to configure your Apple credentials:

```bash
npm run setup-testflight
```

This will prompt you for:
- **Apple ID**: Your Apple Developer account email
- **ASC App ID**: Found in App Store Connect → Your App → App Information → Apple ID
- **Apple Team ID**: Found in Apple Developer → Membership → Team ID

## Step 2: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click the "+" button → "New App"
3. Fill in:
   - **Platforms**: iOS
   - **Name**: LivActiv
   - **Bundle ID**: `com.thesushant50.LivActiv`
   - **SKU**: `livactiv-ios`
   - **User Access**: Full Access

## Step 3: Build for TestFlight

```bash
npm run build-testflight
```

This will:
- Build your app using EAS Build
- Create an iOS archive (.ipa file)
- Upload to App Store Connect

## Step 4: Submit to TestFlight

```bash
npm run submit-testflight
```

Or build and submit in one command:
```bash
npm run build-and-submit
```

## Step 5: Add Testers

1. Go to App Store Connect → Your App → TestFlight
2. Add testers:
   - **Internal Testers**: Your development team
   - **External Testers**: Your friends (up to 10,000)

3. For external testers:
   - Click "+" to add tester
   - Enter their email address
   - They'll receive an email invitation

## Step 6: Your Friends Install the App

Your friends need to:
1. Install TestFlight app from App Store
2. Check their email for the invitation
3. Accept the invitation in TestFlight
4. Install your LivActiv app

## Troubleshooting

### Common Issues:

**Build fails:**
```bash
# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]
```

**Submission fails:**
- Verify Apple credentials in `.env` file
- Check that app exists in App Store Connect

**App rejected:**
- Check App Store Review Guidelines
- Ensure all required metadata is provided

### Useful Commands:

```bash
# Check current build status
eas build:list

# View detailed build logs
eas build:view [BUILD_ID]

# Update app configuration
eas build:configure

# Check EAS project status
eas project:info
```

## Environment Variables Reference

Your `.env` file should contain:

```env
APPLE_ID=your-apple-id@example.com
ASC_APP_ID=your-app-store-connect-app-id
APPLE_TEAM_ID=your-apple-team-id
```

## Where to Find Your Credentials

### Apple ID
- Your Apple Developer account email

### ASC App ID
1. Go to App Store Connect
2. Select your app
3. Go to App Information
4. Copy the "Apple ID" (it's a number)

### Apple Team ID
1. Go to [Apple Developer](https://developer.apple.com)
2. Sign in with your Apple ID
3. Go to Membership
4. Copy the "Team ID"

## Support Resources

- [EAS Documentation](https://docs.expo.dev/eas/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Apple Developer Support](https://developer.apple.com/support/)

---

**Note**: Make sure to keep your `.env` file secure and never commit it to version control! 