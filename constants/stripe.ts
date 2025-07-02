// Stripe Configuration for LivActiv Production
// This file contains all Stripe-related configuration and can be easily switched between test and live modes

export const STRIPE_CONFIG = {
  // TEST MODE - Replace with your actual Stripe test keys
  test: {
    publishableKey: 'pk_test_51Nw...', // Replace with your Stripe test publishable key
    secretKey: 'sk_test_...', // Replace with your Stripe test secret key (backend only)
    webhookSecret: 'whsec_...', // Replace with your Stripe test webhook secret
  },
  
  // LIVE MODE - Replace with your actual Stripe live keys (for production)
  live: {
    publishableKey: 'pk_live_...', // Replace with your Stripe live publishable key
    secretKey: 'sk_live_...', // Replace with your Stripe live secret key (backend only)
    webhookSecret: 'whsec_...', // Replace with your Stripe live webhook secret
  }
};

// Current mode - Change this to 'live' for production
export const STRIPE_MODE = 'test';

// Get current configuration based on mode
export const getStripeConfig = () => {
  return STRIPE_CONFIG[STRIPE_MODE as keyof typeof STRIPE_CONFIG];
};

// Get current publishable key
export const getStripePublishableKey = () => {
  return getStripeConfig().publishableKey;
};

// Test card numbers for development
export const TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  insufficientFunds: '4000000000009995',
  expired: '4000000000000069',
  incorrectCvc: '4000000000000127',
  processingError: '4000000000000119',
};

// Test mode indicators
export const TEST_MODE_INDICATORS = {
  banner: {
    backgroundColor: '#FFF8E1',
    textColor: '#FFA000',
    text: 'TEST MODE — Payments are not live',
  },
  info: {
    backgroundColor: '#F3F4F6',
    textColor: '#6B7280',
    text: 'Use test card: 4242 4242 4242 4242, any future date, any CVC',
  },
  button: {
    backgroundColor: '#FFA000',
    textColor: '#FFFFFF',
    text: 'Pay (Test Mode)',
  },
};

// Live mode indicators
export const LIVE_MODE_INDICATORS = {
  banner: {
    backgroundColor: '#E8F5E8',
    textColor: '#2E7D32',
    text: 'LIVE PAYMENTS — Real money will be charged',
  },
  info: {
    backgroundColor: '#F3F4F6',
    textColor: '#6B7280',
    text: 'Your payment is secure and encrypted',
  },
  button: {
    backgroundColor: '#1877F2',
    textColor: '#FFFFFF',
    text: 'Pay Securely',
  },
};

// Get current mode indicators
export const getModeIndicators = () => {
  return STRIPE_MODE === 'test' ? TEST_MODE_INDICATORS : LIVE_MODE_INDICATORS;
};

// Payment status tracking
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// Payment validation
export const validatePaymentAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 999999; // Stripe limit
};

export const formatAmount = (amount: number): string => {
  return (amount / 100).toFixed(2); // Convert cents to dollars
};

export const parseAmount = (amount: string): number => {
  return Math.round(parseFloat(amount) * 100); // Convert dollars to cents
};

// Error handling
export const STRIPE_ERRORS = {
  CARD_DECLINED: 'Your card was declined.',
  EXPIRED_CARD: 'Your card has expired.',
  INCORRECT_CVC: 'Your card\'s security code is incorrect.',
  INSUFFICIENT_FUNDS: 'Your card has insufficient funds.',
  INVALID_EXPIRY_MONTH: 'Your card\'s expiration month is invalid.',
  INVALID_EXPIRY_YEAR: 'Your card\'s expiration year is invalid.',
  INVALID_NUMBER: 'Your card number is invalid.',
  PROCESSING_ERROR: 'An error occurred while processing your card.',
  INVALID_REQUEST: 'The payment request is invalid.',
  API_ERROR: 'An error occurred with our payment processor.',
  NETWORK_ERROR: 'A network error occurred. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export const getStripeErrorMessage = (errorCode: string): string => {
  return STRIPE_ERRORS[errorCode as keyof typeof STRIPE_ERRORS] || STRIPE_ERRORS.UNKNOWN_ERROR;
};

// Simplified payment flow without backend
export const createPaymentIntent = async (amount: number, currency: string = 'usd', metadata?: any) => {
  // In a production app, you would typically create PaymentIntents on your server
  // For this demo, we'll simulate the PaymentIntent creation
  // In real implementation, you would call your server or use Firebase Functions
  
  console.log('Creating PaymentIntent:', { amount, currency, metadata });
  
  // Simulate PaymentIntent creation
  const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const clientSecret = `pi_${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    clientSecret,
    paymentIntentId,
    amount,
    currency,
    status: 'requires_payment_method',
  };
};

// Simplified payment confirmation without backend
export const confirmPaymentWithBackend = async (paymentIntentId: string, bookingId: string) => {
  // In a production app, you would verify the payment with your server
  // For this demo, we'll simulate the confirmation
  console.log('Confirming payment:', { paymentIntentId, bookingId });
  
  return {
    success: true,
    paymentIntentId,
    bookingId,
    status: 'succeeded',
  };
};

// Simplified payment status check without backend
export const getPaymentStatus = async (paymentIntentId: string) => {
  // In a production app, you would check the payment status with your server
  // For this demo, we'll simulate the status check
  console.log('Getting payment status:', paymentIntentId);
  
  return {
    paymentIntentId,
    status: 'succeeded',
    amount: 2500, // Default amount
    currency: 'usd',
    created: Date.now(),
    metadata: {},
  };
}; 