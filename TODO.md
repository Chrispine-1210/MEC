# Referral + Payments System Implementation TODO

Status: 0/28 ✅ In Progress

## 1. PROJECT SETUP (3/3) ✅
- [x] Create server/ directory structure (package.json, src/)
- [x] Setup client/ deps (@stripe/*, fingerprintjs)
- [x] Docker-compose.yml + .env.example

## 2. DATABASE & PRISMA (4/4) ✅
- [ ] npx prisma init + schema.prisma (models: User,Referral,Payment,Wallet,Transaction)
- [ ] Add fraud fields (deviceFingerprint, ipHash)
- [ ] npx prisma migrate dev --name init
- [ ] npx prisma generate + seed.ts (test users/codes)

## 3. BACKEND CORE (6/6)
- [ ] server/src/server.ts (Express, CORS, helmet, Prisma connect)
- [ ] Auth middleware (JWT from existing AuthProvider)
- [ ] Rate limiting + idempotency
- [ ] Stripe init + test keys
- [ ] Fingerprint middleware
- [ ] BullMQ + Redis for delayed payouts

## 4. REFERRAL MODULE (5/5)
- [ ] /api/referrals/generate (unique code/link)
- [ ] /api/referrals/:code/stats (RT dashboard)
- [ ] /api/referrals/claim (track signup, fraud check)
- [ ] Multi-tier logic + expiry
- [ ] Campaign boosts

## 5. PAYMENTS MODULE (4/4)
- [ ] /api/payments/checkout-session (Stripe + Link)
- [ ] /api/webhooks/stripe (idempotent, commission calc)
- [ ] Commission algo (10% L1, 5% L2)
- [ ] Queue payout after 7d

## 6. WALLET & PAYOUTS (3/3)
- [ ] /api/wallet/balance, /withdraw
- [ ] Tx ledger
- [ ] Threshold payouts (Stripe Connect)

## 7. FRONTEND INTEGRATION (6/6)
- [ ] App.tsx: Add routes (/referrals, /wallet, /checkout)
- [ ] admin-sidebar.tsx: Add Referrals/Wallet nav
- [ ] ReferralDashboard component (DataTable, copy code)
- [ ] WalletBalance + history
- [ ] StripeCheckout (Elements, Link)
- [ ] Fraud alerts/UI

## 8. ADMIN & ANALYTICS (4/4)
- [ ] /admin/referrals (leaderboard, rates)
- [ ] Fraud logs
- [ ] CAC/LTV metrics
- [ ] Commission overrides

## 9. TESTING & DEPLOY (3/3)
- [ ] Local: npm run dev (both), Stripe CLI webhooks
- [ ] Fraud sim + e2e tests
- [ ] Deploy: Vercel(frontend)/Railway(backend)

## Commands to Run
```
# Backend
cd server && npm i && npx prisma migrate dev && npm run dev

# Frontend  
cd client && npm i && npm run dev

# Webhooks
