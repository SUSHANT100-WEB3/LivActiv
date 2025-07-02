#!/bin/bash

# LivActiv Stripe Deployment Script
# This script helps you deploy the Stripe backend and configure the app

echo "🚀 LivActiv Stripe Deployment Script"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend-example" ]; then
    echo "❌ Error: Please run this script from the LivActiv project root directory"
    exit 1
fi

echo ""
echo "📋 Prerequisites:"
echo "1. Stripe account (https://stripe.com)"
echo "2. Heroku account (https://heroku.com) - for backend deployment"
echo "3. Heroku CLI installed"
echo ""

read -p "Do you have a Stripe account? (y/n): " has_stripe
if [ "$has_stripe" != "y" ]; then
    echo "Please create a Stripe account at https://stripe.com first"
    exit 1
fi

read -p "Do you have a Heroku account? (y/n): " has_heroku
if [ "$has_heroku" != "y" ]; then
    echo "Please create a Heroku account at https://heroku.com first"
    exit 1
fi

echo ""
echo "🔑 Step 1: Get your Stripe keys"
echo "================================"
echo "1. Go to https://dashboard.stripe.com/apikeys"
echo "2. Copy your TEST publishable key (starts with pk_test_)"
echo "3. Copy your TEST secret key (starts with sk_test_)"
echo ""

read -p "Enter your TEST publishable key: " test_publishable_key
read -p "Enter your TEST secret key: " test_secret_key

echo ""
echo "🌐 Step 2: Deploy backend to Heroku"
echo "==================================="

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "Please log in to Heroku:"
    heroku login
fi

read -p "Enter your Heroku app name (or press Enter to create one): " heroku_app_name

if [ -z "$heroku_app_name" ]; then
    echo "Creating new Heroku app..."
    heroku_app_name=$(heroku create --json | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    echo "Created app: $heroku_app_name"
fi

echo ""
echo "📦 Deploying backend to Heroku..."

cd backend-example

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
    git add .
    git commit -m "Initial backend deployment"
fi

# Add Heroku remote
heroku git:remote -a "$heroku_app_name"

# Set environment variables
echo "Setting environment variables..."
heroku config:set STRIPE_TEST_SECRET_KEY="$test_secret_key"
heroku config:set NODE_ENV=production

# Deploy
echo "Deploying..."
git add .
git commit -m "Deploy with Stripe configuration"
git push heroku main

# Get the app URL
backend_url=$(heroku info -s | grep web_url | cut -d= -f2)
echo "✅ Backend deployed to: $backend_url"

cd ..

echo ""
echo "⚙️ Step 3: Update app configuration"
echo "==================================="

# Update the Stripe configuration
echo "Updating constants/stripe.ts..."

# Create a backup
cp constants/stripe.ts constants/stripe.ts.backup

# Update the configuration
sed -i.bak "s|pk_test_51Nw...|$test_publishable_key|g" constants/stripe.ts
sed -i.bak "s|https://your-backend-url.com/api|$backend_url/api|g" constants/stripe.ts

echo "✅ Configuration updated!"

echo ""
echo "🔗 Step 4: Set up webhooks"
echo "==========================="
echo "1. Go to https://dashboard.stripe.com/webhooks"
echo "2. Click 'Add endpoint'"
echo "3. Enter URL: $backend_url/api/webhook"
echo "4. Select events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded"
echo "5. Copy the webhook signing secret"
echo ""

read -p "Enter your webhook signing secret (starts with whsec_): " webhook_secret

if [ ! -z "$webhook_secret" ]; then
    echo "Setting webhook secret..."
    heroku config:set STRIPE_TEST_WEBHOOK_SECRET="$webhook_secret"
fi

echo ""
echo "🧪 Step 5: Test the integration"
echo "==============================="
echo "1. Start your app: npm start"
echo "2. Try booking a paid event"
echo "3. Use test card: 4242 4242 4242 4242"
echo "4. Check the payment flow works"
echo ""

echo "✅ Stripe integration setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Test the payment flow with test cards"
echo "2. When ready for production, get your LIVE keys from Stripe"
echo "3. Update STRIPE_MODE to 'live' in constants/stripe.ts"
echo "4. Set up production webhooks"
echo ""
echo "🔗 Useful links:"
echo "- Stripe Dashboard: https://dashboard.stripe.com"
echo "- Heroku Dashboard: https://dashboard.heroku.com"
echo "- Backend Health Check: $backend_url/api/health"
echo ""
echo "🎉 Happy coding!" 