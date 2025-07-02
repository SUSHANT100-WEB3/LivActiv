# Quick Stripe Setup for LivActiv

## 🚀 Get Stripe Working in 5 Minutes

### Step 1: Get Test Keys (2 minutes)
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **TEST publishable key** (starts with `pk_test_`)
3. Copy your **TEST secret key** (starts with `sk_test_`)

### Step 2: Update Configuration (1 minute)
Replace the placeholder in `constants/stripe.ts`:

```typescript
export const STRIPE_CONFIG = {
  test: {
    publishableKey: 'pk_test_YOUR_ACTUAL_KEY_HERE', // ← Replace this
    secretKey: 'sk_test_YOUR_ACTUAL_KEY_HERE', // ← Replace this
    webhookSecret: 'whsec_...', // ← We'll get this later
    apiBaseUrl: 'https://your-backend-url.com/api', // ← We'll deploy this
  },
  // ... rest stays the same
};
```

### Step 3: Deploy Backend (2 minutes)

#### Option A: Deploy to Heroku (Recommended)
```bash
# Install Heroku CLI first: https://devcenter.heroku.com/articles/heroku-cli

cd backend-example
heroku create your-livactiv-backend
heroku config:set STRIPE_TEST_SECRET_KEY=sk_test_YOUR_KEY_HERE
heroku config:set NODE_ENV=production

git init
git add .
git commit -m "Initial deployment"
heroku git:remote -a your-livactiv-backend
git push heroku main
```

#### Option B: Deploy to Vercel
```bash
cd backend-example
npm i -g vercel
vercel
# Set environment variables in Vercel dashboard
```

### Step 4: Update Backend URL
Update `constants/stripe.ts` with your deployed backend URL:
```typescript
apiBaseUrl: 'https://your-livactiv-backend.herokuapp.com/api',
```

### Step 5: Test It! 🎉
1. Start your app: `npm start`
2. Try booking a paid event
3. Use test card: `4242 4242 4242 4242`
4. Any future date, any CVC

## 🧪 Test Cards
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient**: `4000 0000 0000 9995`

## 🔧 Troubleshooting

### "Payment not initialized"
- Check your backend URL is correct
- Verify backend is deployed and running
- Check browser console for errors

### "Invalid publishable key"
- Make sure you copied the TEST key (starts with `pk_test_`)
- Check the key is properly formatted

### Backend deployment fails
- Make sure Heroku CLI is installed
- Check you're logged in: `heroku auth:whoami`
- Verify your Stripe secret key is correct

## 📞 Need Help?
- Check the full setup guide: `STRIPE_SETUP_GUIDE.md`
- Stripe docs: https://stripe.com/docs
- Heroku docs: https://devcenter.heroku.com

## 🎯 What's Next?
Once test mode works:
1. Get LIVE keys from Stripe
2. Set up webhooks
3. Switch to live mode
4. Start accepting real payments! 