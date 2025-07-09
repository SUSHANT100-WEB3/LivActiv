# LivActiv

LivActiv is a US-focused mobile app (iOS-first, React Native) connecting sports enthusiasts (“Players”) with professional trainers/coaches for real-world fitness, sports, and wellness events.

## Features & Status

| Feature                        | Status         | Notes                                                      |
|--------------------------------|----------------|------------------------------------------------------------|
| Unified onboarding & profiles  | ✅ Functional  | Apple/email/phone login, role selection, profile setup     |
| Map & event discovery          | ✅ Functional  | Map/list view, filters, geolocation, pin colors            |
| Event posting & booking        | ✅ Functional  | Trainers post, players book/join, booking status, payments |
| Payments (Stripe test mode)    | ✅ Functional  | Test mode only, no live payments                           |
| Chat (1:1, group)              | 🚧 Partial     | UI present, backend not implemented                        |
| Notifications                  | ✅ Functional  | Push via Firebase Cloud Messaging                          |
| Real-time updates              | ✅ Functional  | Firestore listeners for events/bookings                    |
| My Activities tab              | ✅ Functional  | Upcoming/past for players, all sessions for trainers       |
| League/team tools              | 🚫 Out of scope| “Coming Soon” banner only                                  |
| Backend (Node.js/Express)      | 🚫 Not present | All backend via Firebase                                   |

## Tech Stack

- React Native (Expo)
- Firebase (Firestore, Auth, Messaging)
- Stripe (test mode)
- React Navigation
- react-native-maps (Google Maps)
- TypeScript

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npx expo start
   ```
3. Configure your Firebase and Stripe keys in `/constants/firebaseConfig.ts` and `/constants/stripe.ts`.

## Production Readiness

- **Frontend:** All MVP features except chat are production-ready.
- **Backend:** Firebase is used for all backend needs; scalable for MVP.
- **Payments:** Stripe is in test mode only.
- **Chat:** UI only; backend not implemented.
- **League/team tools:** Not included in MVP.

## Out of Scope

- League/team management (rosters, schedules, divisions)
- Live payments (until post-validation)
- Full chat backend (planned for future)

---

**For visual workflows and roadmap, see:**  
_LivActiv Workflows and Delivery Roadmap_ (link to be added)
