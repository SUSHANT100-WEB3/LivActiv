#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupTestFlight() {
  console.log('🚀 LivActiv TestFlight Setup\n');
  console.log('This script will help you configure your environment for TestFlight distribution.\n');

  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  const envExists = fs.existsSync(envPath);

  if (envExists) {
    console.log('✅ .env file already exists');
    const overwrite = await question('Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📋 Please provide your Apple Developer credentials:\n');

  const appleId = await question('Apple ID (email): ');
  const ascAppId = await question('App Store Connect App ID: ');
  const appleTeamId = await question('Apple Team ID: ');

  // Create .env content
  const envContent = `# Apple Developer Credentials for TestFlight
APPLE_ID=${appleId}
ASC_APP_ID=${ascAppId}
APPLE_TEAM_ID=${appleTeamId}

# Optional: App Store Connect API Key (for automated submissions)
# ASC_API_KEY_ID=your-api-key-id
# ASC_API_KEY_ISSUER_ID=your-issuer-id
# ASC_API_KEY_PATH=path/to/your/AuthKey_XXXXXXXXXX.p8
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ .env file created successfully!');

  console.log('\n📝 Next steps:');
  console.log('1. Make sure you have an Apple Developer account ($99/year)');
  console.log('2. Create an app in App Store Connect with bundle ID: com.thesushant50.LivActiv');
  console.log('3. Run: eas build --platform ios --profile testflight');
  console.log('4. Run: eas submit --platform ios --profile testflight');
  console.log('5. Add testers in App Store Connect → TestFlight');

  console.log('\n🔗 Useful links:');
  console.log('- App Store Connect: https://appstoreconnect.apple.com');
  console.log('- Apple Developer: https://developer.apple.com');
  console.log('- EAS Documentation: https://docs.expo.dev/eas/');

  rl.close();
}

setupTestFlight().catch(console.error); 