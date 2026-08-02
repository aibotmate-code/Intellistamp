# Business Requirements Document (BRD)

## 1. Executive Summary
IntelliStamp is a digital loyalty card platform designed to eliminate friction in customer retention for local businesses. By providing a zero-app, QR-based stamping flow, it enables businesses to issue rewards quickly while maintaining tenant isolation and data security. 

## 2. Business Problem
Physical loyalty cards are easily lost, and traditional digital apps require too much friction (downloads, passwords, forms). Businesses lack visibility into returning customers and struggle with fraudulent stamps when using generic QR codes.

## 3. Product Vision
To be the most frictionless customer loyalty system, requiring zero app downloads or passwords for the end customer, while giving businesses powerful retention tools and secure operations.

## 4. Target Customers
Local brick-and-mortar retail, cafes, salons, and restaurants seeking simple digital loyalty programs without heavy POS integrations.

## 5. Primary Business Users
- **Owners**: Manage the business profile, staff PINs, feature toggles, and view analytics.
- **Staff**: Manually verify stamps or lookup customers securely when the Staff PIN feature is active.

## 6. End Customers
Shoppers who visit the business, scan the QR code to collect stamps, and redeem rewards.

## 7. Business Value
- **For Businesses**: Increased customer retention, detailed visit analytics, and secure fraud-proof stamping.
- **For Customers**: No apps to download, instant card access via phone number, and frictionless rewards.

## 8. Core Use Cases
- Customer scans QR to earn a stamp.
- Business owner enables security settings (Staff PIN).
- Staff looks up customer manually.
- Customer redeems completed card for a reward.

## 9. Free, Pro and Future Plan Differences
- **Free Plan**: Core stamping functionality, locked security features (e.g., Staff PIN Validator cannot be enabled), standard cooldowns. Existing legacy PIN hashes may be retained but are not enforced.
- **Pro Plan**: Advanced security including Staff PIN management (Set, Change, Reset), WhatsApp campaigns, and custom branding.
- **Future Plans**: Deeper POS integrations and automated marketing.

## 10. Customer Journey
1. **New Customer**: Scans QR → Enters phone number and name → Customer profile created → Atomic stamp issued → Temporary read-only card displayed.
2. **Returning Customer**: Scans QR → Enters phone number → Recognized by system → Atomic stamp issued → Temporary read-only card displayed.
*Security remains completely invisible to the customer during normal operations.*

## 11. Business-Owner Journey
Signs up → configures business (stamps required, rewards) → generates secure QR → manages Staff PIN if on Pro plan → views analytics.

## 12. Staff Journey
Uses the business dashboard to lookup customers by phone number. If Staff PIN Validator is enabled, the staff member must enter the 4-digit PIN to manually issue a stamp or process a redemption.

## 13. Loyalty and Reward Model
Customers earn 1 stamp per eligible visit. Upon reaching the threshold (e.g., 10 stamps), the card is marked redeemable. Redemptions are processed manually by staff (out of scope for customer self-serve).

## 14. Success Metrics
- Average time from scan to stamp.
- Percentage of returning customers.
- Total stamps issued vs. rewards redeemed.

## 15. Business Rules
- **QR Stamping**: A customer scans a rotating business QR.
- **Identification**: The customer enters their phone number. A new customer may also provide their name.
- **Frictionless QR**: A successful QR stamp does not require a Staff PIN.
- **Staff Operations**: Staff PIN applies only to protected staff/manual operations when enabled and entitled.
- **Card Access**: Temporary card access is read-only (5-minute grant).
- **Redemption**: Reward redemption remains a separate protected operation.
- **Phone Numbers**: The same phone number may belong to customers across separate businesses.
- **Tenant Isolation**: Data must remain strictly tenant-isolated.
- **Plan Enforcement**: Free-plan businesses cannot enable the Pro Staff PIN feature.
- **Downgrades**: Plan downgrade stops Staff PIN enforcement but may preserve its hash.
- **Security**: Existing PINs are never displayed or recoverable.

## 16. Out-of-Scope Functionality
- Customer-initiated self-serve reward redemption.
- Native iOS/Android apps.
- Complex multi-tiered loyalty points.

## 17. Risks and Mitigations
- **QR Fraud**: Mitigated by signed, rotating QR codes and 4-hour cooldown periods.
- **Data Leaks**: Mitigated by RLS, isolated queries, and read-only tokenized card access.

## 18. Assumptions
- Customers possess a smartphone with a web browser and camera.
- Businesses have an internet-connected device to display the QR.

## 19. Dependencies
- Supabase (Auth, Database, RPC).
- Vercel (Hosting, Edge Functions).

## 20. Launch Criteria
- Successful pilot in staging environment.
- Automated tests passing.
- Documented operations runbook.
- Zero known high-severity security vulnerabilities.

## 21. Pilot Criteria
- Deployment to Preview environment.
- Staging database populated with test data.
- Successful manual verification of all core flows.

## 22. Future Roadmap
- POST-body grant exchange to replace URL parameters.
- Advanced WhatsApp campaign integrations.
- POS webhook integrations.

---
### Implementation Status
- **Implemented**: Rotating QR, atomic stamping, rate limiting, temporary card access, Staff PIN management (Set, Change, Reset), tenant isolation.
- **Implemented but awaiting wider pilot**: Full Staff PIN enforcement on all manual dashboard routes.
- **Planned**: Hardened POST-body grant exchange.
- **Intentionally Excluded**: Customer self-serve reward redemption.
