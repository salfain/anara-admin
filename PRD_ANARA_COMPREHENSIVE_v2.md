# 📋 PRD - Anara Quick Replies Web Application
## Design + Development + Architecture Integration

**Document Version:** 2.0 (Design Integrated)  
**Last Updated:** August 26, 2026  
**Status:** Ready for Development  
**Priority:** High  
**Design Source:** Claude Design (Standalone)

---

## Executive Summary

### Project Overview
Anara Quick Replies adalah web application terpadu untuk tim Customer Service Anara. Aplikasi ini menggabungkan:
- **Frontend:** React-based UI (dari Claude Design)
- **Backend:** Node.js + Express API
- **Database:** PostgreSQL di Coolify
- **Authentication:** Email/Password + Google OAuth

Fungsi: CS team dapat dengan cepat mencari, menyalin, dan melacak penggunaan pre-written responses untuk menjawab pertanyaan customer tentang paket wisata Anara.

### Problem Solved
- ⏱️ Response time: 5 menit → 10 detik
- 📊 Consistency: Semua CS pakai template yang sama
- 📈 Insights: Tracking pertanyaan paling sering
- 👥 Collaboration: Team dapat contribute & share

### Expected Outcomes
- Faster customer service response
- Consistent answer quality
- Data-driven improvements
- Team productivity increase

---

## 1. Product Vision & Goals

### Vision Statement
"Menjadi centralized knowledge base untuk customer service Anara, memungkinkan setiap pertanyaan customer dijawab dengan cepat, konsisten, dan profesional melalui interface yang intuitif dan mobile-friendly."

### Core Goals
1. **Speed:** Reduce response time dari 5 menit menjadi < 30 detik
2. **Consistency:** Single source of truth untuk semua balasan
3. **Intelligence:** Track & analyze pertanyaan paling sering
4. **Scalability:** Support 50-100+ team members
5. **Usability:** Intuitive UI yang mudah digunakan

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| CS Adoption | 100% | Monthly active users |
| Avg Response Time | < 30 sec | Track via analytics |
| Search Effectiveness | > 90% | Find answer in 1st search |
| System Uptime | 99.5% | Monitoring dashboard |
| User Satisfaction | > 4.5/5 | Post-launch survey |

---

## 2. Product Overview & Features

### 2.1 Core Features (MVP)

#### Authentication System
**Login Page (Mobile + Desktop)**
- Email/password login form
- Google OAuth button ("Login dengan Google")
- Email validation
- Password security (min 8 chars, bcrypt hashing)
- JWT token-based sessions (7-day expiry)
- "Forgot password?" link (Phase 2)
- "Sign up" link untuk new users

**User Roles:**
- **CS (Customer Service):** View, search, copy, track usage
- **Admin:** Create/edit/delete replies, manage users, view analytics

---

#### Dashboard - Main Hub
**Layout Components:**

1. **Header**
   - Logo (Anara branding)
   - Search icon
   - User profile dropdown
   - Logout button

2. **Sidebar Navigation**
   - Dashboard (home icon)
   - Analytics (chart icon)
   - Admin (gear icon) - if admin role
   - Settings (settings icon)
   - Logout button

3. **Main Content Area**
   - **Search Bar (Sticky top)**
     - Placeholder: "Search questions or answers..."
     - Real-time search (< 500ms)
     - Search across: question text, answer content, tags
   
   - **Filter Panel**
     - Category dropdown (Harga, Jadwal, Visa, Pembayaran, dll)
     - Package dropdown (Hongkong, Korea, Vietnam, Eropa, dll)
     - Tags filter (multi-select)
     - "Clear filters" button
   
   - **Results Section**
     - "Found X replies" counter
     - Sort dropdown (Most Used, Recently Added, Alphabetical)
     - "+ Add Reply" button (shows modal)
   
   - **Q&A Card List**
     Each card contains:
     - Question title (bold, full text)
     - Answer preview (2 lines, truncated)
     - Metadata badges:
       - Package (blue pill)
       - Category (purple pill)
       - Usage count ("📊 Used X times")
     - Action buttons:
       - Copy (→ triggers copy + usage tracking)
       - Edit (→ opens edit modal)
       - Delete (→ admin only, confirmation dialog)
     - Hover state: Lift shadow, subtle background change
   
   - **Pagination**
     - 50 items per page
     - Page numbers or "Load more" button
     - Smooth scrolling

---

#### Add/Edit Reply Modal
**Modal Structure:**

```
┌─────────────────────────────────┐
│ Add Quick Reply          [X]     │
├─────────────────────────────────┤
│ Question *                      │
│ [Text input - min 10 chars]     │
│                                  │
│ Answer *                        │
│ [Textarea - min 50 chars]       │
│ Char count: 150/5000            │
│                                  │
│ Package (optional)              │
│ [Dropdown - Select...]          │
│                                  │
│ Category (optional)             │
│ [Dropdown - Select...]          │
│                                  │
│ Tags (optional)                 │
│ [Text input - comma separated]  │
│                                  │
│ [Cancel] [Save]                 │
└─────────────────────────────────┘
```

**Functionality:**
- Form validation (required fields, min lengths)
- Auto-save draft (Phase 2)
- Character counter for answer
- Category/tag autocomplete suggestions
- Success/error toast notifications
- After save: auto-close modal, reply appears in list

---

#### Analytics Page

**Section 1: Summary Metrics (4 cards)**
- Total Replies: 125
- Total Usage: 2,450x
- Active Users: 8
- System Uptime: 99.8%

**Section 2: Charts**
- **Top 10 Questions:** Horizontal bar chart (usage count)
- **Category Distribution:** Pie chart (count per category)
- **Usage Trend:** Line chart (daily/weekly usage)

**Section 3: Category Breakdown Table**
- Columns: Category | Replies | Total Usage | % of Total
- Sortable, paginated
- Export to CSV (Phase 2)

**Section 4: Date Range Filter**
- Calendar picker (start & end date)
- Preset buttons: Today, This Week, This Month, Custom

---

#### Admin Panel

**User Management Section:**
- Table with columns: Email | Name | Role | Join Date | Actions
- Pagination (10 per page)
- Search by email/name
- Edit role (CS ↔ Admin)
- Delete user (confirmation)
- Add new user form
- Bulk actions (Phase 2)

**Team Activity Log:**
- Show recent actions: "User X created/edited/deleted reply Y at time Z"
- Filter by user/action/date
- Export log (Phase 2)

---

### 2.2 Design System (From Claude Design Integration)

#### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | #2563eb | Buttons, active states, highlights |
| Primary Blue Hover | #1d4ed8 | Button hover |
| Secondary Gray | #64748b | Secondary text, borders |
| Light Gray | #f9fafb | Secondary backgrounds |
| Medium Gray | #e5e7eb | Borders, dividers |
| Dark Gray | #111827 | Headings, primary text |
| Success Green | #10b981 | Positive actions |
| Warning Orange | #f59e0b | Alerts |
| Danger Red | #ef4444 | Destructive actions |

#### Typography Scale
- **H1:** 32px, Bold (700), Line 1.2
- **H2:** 28px, Bold (700), Line 1.3
- **H3:** 20px, Semibold (600), Line 1.4
- **H4:** 16px, Semibold (600), Line 1.5
- **Body Regular:** 14px, Regular (400), Line 1.6
- **Body Small:** 12px, Regular (400), Line 1.5
- **Button:** 14px, Semibold (600), Uppercase
- **Label:** 12px, Semibold (600), Uppercase, Letter-spacing +0.5px

#### Spacing Scale
2px, 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

**Standard Application:**
- Card padding: 24px
- Section gap: 32px
- Element gap: 16px
- Input padding: 12px (horizontal) × 10px (vertical)

#### Components Library
**Buttons**
- Primary (blue), Secondary (white + border), Danger (red)
- Sizes: Small (24px), Medium (32px), Large (40px)
- States: Default, Hover, Active, Disabled, Loading

**Inputs**
- Text input, Textarea
- States: Default, Focus (blue border), Error (red), Disabled
- Validation messaging (red text below)

**Cards**
- Q&A Reply Card (white bg, border, shadow)
- Metric Card (light bg, no border)
- User Card (for admin panel)

**Other Components**
- Modal/Dialog (centered, backdrop blur)
- Toast Notification (top-right, auto-dismiss 3s)
- Badge/Tag (small colored pill)
- Pagination (numbered or "Load More")
- Loading Spinner (animated circle)
- Empty State (icon + message)
- Error State (red icon + message)

---

### 2.3 Responsive Design

**Breakpoints:**
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

**Mobile Layout:**
- Single column
- Sidebar → hamburger menu
- Full-width cards
- Stacked form inputs
- Touch-friendly: 44px min tap targets

**Tablet Layout:**
- 2 columns where applicable
- Sidebar collapses to icons
- Optimized spacing

**Desktop Layout:**
- Full sidebar visible
- Multi-column layouts
- Optimized for large screens

---

## 3. User Stories & Use Cases

### Epic 1: Authentication

**US-1.1: User Signup**
- As a new CS team member, I want to create an account with email/password
- So that I can access the quick replies system
- **Acceptance Criteria:**
  - ✅ Signup form with email & password fields
  - ✅ Password validation (min 8 chars)
  - ✅ Email verification (OTP or link) - Phase 2
  - ✅ Auto-login after signup
  - ✅ JWT token stored in localStorage

**US-1.2: User Login**
- As a CS team member, I want to login with email/password or Google
- So that I can access my account
- **Acceptance Criteria:**
  - ✅ Email/password login works
  - ✅ Google OAuth integration works
  - ✅ Remember me checkbox (Phase 2)
  - ✅ Session persists for 7 days
  - ✅ Forgot password flow (Phase 2)

---

### Epic 2: Quick Replies Management

**US-2.1: Search Quick Replies**
- As a CS member, I want to search replies by question text
- So that I can find the right answer quickly
- **Acceptance Criteria:**
  - ✅ Search updates results in real-time
  - ✅ Search time < 500ms
  - ✅ Case-insensitive search
  - ✅ Search both question & answer text
  - ✅ Highlight search terms in results

**US-2.2: Filter by Category/Package**
- As a CS member, I want to filter replies by category or package
- So that I can see relevant answers only
- **Acceptance Criteria:**
  - ✅ Filter dropdowns work smoothly
  - ✅ Multi-select filtering supported
  - ✅ Combine search + filter
  - ✅ Show result count
  - ✅ Clear filters button

**US-2.3: Copy Reply Answer**
- As a CS member, I want to copy an answer with one click
- So that I can paste it directly to the customer
- **Acceptance Criteria:**
  - ✅ Copy button on each card
  - ✅ Copy to clipboard works (all browsers)
  - ✅ Toast: "✓ Copied!"
  - ✅ Usage counter increments
  - ✅ Usage logged with timestamp & user

**US-2.4: Create New Reply**
- As a CS/Admin, I want to create a new quick reply
- So that the team can use it for future customers
- **Acceptance Criteria:**
  - ✅ Add Reply modal opens
  - ✅ Form validation (required fields, min length)
  - ✅ Save to database
  - ✅ Success notification
  - ✅ Reply appears in list immediately

**US-2.5: Edit Existing Reply**
- As an Admin, I want to edit replies for accuracy
- So that answers stay current
- **Acceptance Criteria:**
  - ✅ Edit modal pre-fills with existing data
  - ✅ All fields editable
  - ✅ Save updates to database
  - ✅ Show "Last edited by X on Y"
  - ✅ Version history (Phase 2)

**US-2.6: Delete Reply**
- As an Admin, I want to delete outdated replies
- So that the system stays clean
- **Acceptance Criteria:**
  - ✅ Delete button (admin only)
  - ✅ Confirmation dialog
  - ✅ Remove from list immediately
  - ✅ Soft delete (archive) - Phase 2

---

### Epic 3: Analytics & Insights

**US-3.1: View Top Questions**
- As an Admin, I want to see which replies are used most
- So that I can understand customer pain points
- **Acceptance Criteria:**
  - ✅ Top 10 bar chart (horizontal)
  - ✅ Show usage count & percentage
  - ✅ Sort by most used
  - ✅ Drill-down details (Phase 2)

**US-3.2: Category Analytics**
- As an Admin, I want to see replies breakdown by category
- So that I can prioritize reply creation
- **Acceptance Criteria:**
  - ✅ Pie chart of categories
  - ✅ Count & total usage per category
  - ✅ Sortable table view
  - ✅ Date range filtering

**US-3.3: Team Performance**
- As an Admin, I want to see most active CS members
- So that I can recognize & reward top performers
- **Acceptance Criteria:**
  - ✅ User list with usage stats
  - ✅ Sort by most active
  - ✅ Show last login date
  - ✅ Export report (Phase 2)

---

### Epic 4: User Management (Admin)

**US-4.1: Manage Team Members**
- As an Admin, I want to add/remove/edit team members
- So that I can control access
- **Acceptance Criteria:**
  - ✅ List all users (email, name, role, join date)
  - ✅ Add new user (invite via email)
  - ✅ Change role (CS ↔ Admin)
  - ✅ Delete user (confirmation)
  - ✅ Search users

**US-4.2: View User Activity**
- As an Admin, I want to see each user's activity
- So that I can track usage patterns
- **Acceptance Criteria:**
  - ✅ Activity log (replies created, usage history)
  - ✅ Date range filter
  - ✅ Export to CSV (Phase 2)

---

## 4. Technical Architecture

### 4.1 Technology Stack

**Frontend**
- React 18+
- Vite (build tool)
- Tailwind CSS (styling)
- Zustand (state management)
- React Router (routing)
- Axios (HTTP client)
- Recharts (analytics charts)
- Lucide Icons (UI icons)

**Backend**
- Node.js 16+
- Express.js
- PostgreSQL
- JWT authentication
- bcryptjs (password hashing)
- CORS enabled

**Hosting & Database**
- Frontend: Coolify Static/SPA
- Backend: Coolify Node.js
- Database: Coolify PostgreSQL

**Design**
- Claude Design (UI/UX specifications)
- Figma (collaborative design file)
- Responsive mobile-first approach

---

### 4.2 Database Schema

**Users Table**
```sql
id (PK, serial)
email (VARCHAR, UNIQUE, NOT NULL)
password_hash (VARCHAR)
name (VARCHAR)
google_id (VARCHAR, UNIQUE)
role (VARCHAR: 'cs', 'admin')
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**Packages Table**
```sql
id (PK, serial)
name (VARCHAR, NOT NULL)
destination (VARCHAR)
duration (INT)
year (INT)
dates (VARCHAR)
price (DECIMAL)
status (VARCHAR: 'open', 'promo', 'closed')
notes (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**Quick Replies Table**
```sql
id (PK, serial)
question (VARCHAR, NOT NULL)
answer (TEXT, NOT NULL)
package_id (INT, FK→packages)
category (VARCHAR)
tags (VARCHAR)
usage_count (INT, default: 0)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
created_by (INT, FK→users)
```

**Usage Log Table**
```sql
id (PK, serial)
reply_id (INT, FK→quick_replies, NOT NULL)
used_by (INT, FK→users, NOT NULL)
used_at (TIMESTAMP)
```

**Indexes:**
- quick_replies.category (search by category)
- quick_replies.package_id (filter by package)
- quick_replies.tags (filter by tags)
- users.email (login)

---

### 4.3 API Endpoints

**Authentication**
```
POST   /api/auth/signup          - Register new user
POST   /api/auth/login           - Email/password login
POST   /api/auth/google          - Google OAuth callback
GET    /api/auth/me              - Get current user (protected)
POST   /api/auth/refresh         - Refresh JWT token
POST   /api/auth/logout          - Logout
```

**Quick Replies**
```
GET    /api/quick-replies        - List all (filters, pagination)
POST   /api/quick-replies        - Create new (auth)
GET    /api/quick-replies/:id    - Get single
PUT    /api/quick-replies/:id    - Update (auth)
DELETE /api/quick-replies/:id    - Delete (admin only)
POST   /api/quick-replies/:id/use - Track usage (auth)
```

**Packages**
```
GET    /api/packages             - List all
POST   /api/packages             - Create (admin)
GET    /api/packages/:id         - Get single
PUT    /api/packages/:id         - Update (admin)
DELETE /api/packages/:id         - Delete (admin)
```

**Analytics**
```
GET    /api/analytics/top-questions    - Top 10
GET    /api/analytics/categories       - Category stats
GET    /api/analytics/usage            - Usage trend
GET    /api/analytics/team-stats       - Team performance
```

**Users (Admin)**
```
GET    /api/users                - List all users (admin)
POST   /api/users                - Invite new user (admin)
PUT    /api/users/:id/role       - Change role (admin)
DELETE /api/users/:id            - Delete user (admin)
GET    /api/users/:id/activity   - Activity log (admin)
```

---

### 4.4 Security Requirements

- ✅ JWT tokens (7-day expiry)
- ✅ Password hashing (bcryptjs)
- ✅ CORS configuration
- ✅ Input validation & sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ HTTPS in production
- ✅ Environment variables (no secrets in code)
- ✅ Role-based access control
- ✅ Rate limiting (Phase 2)
- ✅ CSRF protection (Phase 2)

---

### 4.5 Performance Requirements

| Metric | Target |
|--------|--------|
| Page load time | < 3 seconds |
| Search response | < 500ms |
| API response | < 200ms |
| Database queries | < 100ms |
| Concurrent users | 50+ simultaneous |
| Uptime | 99.5% |

---

## 5. UI/UX Specifications (From Claude Design)

### 5.1 Design System Integration

**Color Application:**
- Buttons: Primary Blue (#2563eb)
- Text: Dark Gray (#111827)
- Borders: Medium Gray (#e5e7eb)
- Backgrounds: White (#ffffff) / Light Gray (#f9fafb)
- Success: Green (#10b981)
- Error: Red (#ef4444)

**Typography Hierarchy:**
- Page titles: H1 (32px, bold)
- Section titles: H2 (28px, bold)
- Card titles: H3 (20px, semibold)
- Body text: 14px regular
- Labels: 12px semibold uppercase

**Spacing & Layout:**
- Card padding: 24px
- Section gaps: 32px
- Element gaps: 16px
- Responsive padding adjustments for mobile

**Component States:**
- Buttons: Default, Hover, Active, Disabled, Loading
- Inputs: Default, Focus (blue), Error (red), Disabled
- Cards: Default, Hover (shadow lift), Selected (blue border)

---

### 5.2 Key UI Screens

**Screen 1: Login Page**
- Centered card layout (mobile: full width, desktop: 400px max)
- Email & password inputs
- "Login" button (blue, full width)
- "Login dengan Google" button (secondary style)
- "Don't have account? Sign up" link
- Responsive: Works well on mobile & desktop

**Screen 2: Dashboard**
- 2-column layout: Sidebar (250px) + Main content
- Sticky search bar at top
- Filter panel (collapsible on mobile)
- Q&A cards in grid/list view
- Pagination at bottom
- Mobile: Hamburger menu, single column

**Screen 3: Add/Edit Modal**
- Centered modal (600px max width)
- Form fields: Question, Answer, Package, Category, Tags
- Character counter for answer
- Save & Cancel buttons
- Validation messages (red text)

**Screen 4: Analytics**
- Summary metric cards (4-column grid, responsive)
- Charts: Bar (top questions), Pie (categories)
- Category table below charts
- Date range filter at top

**Screen 5: Admin Panel**
- User management table
- Add user form (card)
- Activity log section
- Sortable/filterable tables

---

### 5.3 Accessibility Standards

- WCAG 2.1 AA compliance
- Keyboard navigation supported
- Screen reader compatible
- Color contrast 4.5:1 for text
- Focus indicators visible (blue outline)
- Alt text for images
- Semantic HTML structure

---

## 6. Project Timeline & Roadmap

### Phase 1: MVP (Weeks 1-2)
**Backend Development**
- [ ] User authentication (signup/login/Google OAuth)
- [ ] CRUD endpoints for quick replies
- [ ] Database schema & migrations
- [ ] Package management endpoints
- [ ] Usage tracking endpoints

**Frontend Development**
- [ ] Login page
- [ ] Dashboard with search/filter
- [ ] Add/Edit reply modal
- [ ] Basic styling (Tailwind CSS)
- [ ] State management (Zustand)

**Deployment**
- [ ] Coolify setup (PostgreSQL, Node.js, Static)
- [ ] Environment configuration
- [ ] Initial testing
- [ ] Live on production URL

**Deliverable:** Working MVP with core features

---

### Phase 2: Analytics & Admin (Week 3)
- [ ] Analytics page & charts
- [ ] Admin user management
- [ ] Activity logging
- [ ] Performance optimization
- [ ] UI refinements
- [ ] QA testing
- [ ] Bug fixes

**Deliverable:** Fully featured app ready for team

---

### Phase 3: Enhancements (Future)
- [ ] Email notifications
- [ ] Advanced search (full-text indexing)
- [ ] Export analytics to PDF
- [ ] Mobile app (React Native)
- [ ] Bulk import from CSV
- [ ] Version history & rollback
- [ ] Dark mode
- [ ] Internationalization (i18n)
- [ ] WhatsApp API integration

---

## 7. Assumptions & Constraints

### Assumptions
1. Team CS: 5-10 people initially
2. Database capacity: 500+ quick replies
3. No compliance requirements (GDPR, HIPAA)
4. PostgreSQL sufficient for scale
5. Google OAuth optional (can add later)
6. Single language: Indonesian/English

### Constraints
- Timeline: 3 weeks MVP
- Budget: Minimal (Coolify free tiers)
- Team: 1-2 developers
- No mobile app in Phase 1
- Single deployment region

---

## 8. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Database connection issues | High | Medium | Proper error handling, monitoring |
| Search performance slow | Medium | Low | Database indexing, pagination |
| Low team adoption | Medium | Low | Training, incentives, easy UX |
| Security breach | High | Low | JWT, HTTPS, input validation |
| Deployment delays | Medium | Medium | Pre-plan Coolify setup |
| Design-dev mismatch | Low | Low | Weekly sync, Figma handoff |

---

## 9. Success Criteria

### MVP Success (Week 2 end)
- ✅ 5+ team members actively using
- ✅ 100+ quick replies in database
- ✅ Zero critical bugs
- ✅ 99% uptime in production
- ✅ Search time < 1 second

### Post-Launch Success (Week 4+)
- ✅ 50% reduction in response time
- ✅ 90%+ user satisfaction score
- ✅ Daily active users > 80%
- ✅ 1000+ usage events per week
- ✅ Feature requests for improvements

---

## 10. Out of Scope (Phase 1)

- Mobile native app
- Real-time collaboration
- AI-powered suggestions
- Multi-language support
- CRM integration
- SMS/WhatsApp API
- Advanced permissions
- API rate limiting per user
- Email notifications
- Offline functionality
- Dark mode

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| Quick Reply | Pre-written answer untuk common customer questions |
| CS | Customer Service team member |
| Package | Tour/travel package (Hongkong, Korea, etc) |
| Category | Type of question (Harga, Jadwal, Visa, Pembayaran) |
| Usage Count | How many times a reply has been used/copied |
| JWT | JSON Web Token untuk authentication |
| Admin | Super user with create/edit/delete permissions |

---

## 12. Appendix: Success Story

### Before (Without App)

Customer: "Berapa harga paket Hongkong?"

CS Process:
1. Check email, Whatsapp, Google Docs (5 min searching)
2. Find price somewhere in old messages
3. Type reply from memory (typo risk)
4. Send to customer (5-10 min total)
5. Customer waits, possibly churn

### After (With App)

Customer: "Berapa harga paket Hongkong?"

CS Process:
1. Open app (1 sec)
2. Search "harga hongkong" (2 sec)
3. Click "Copy Answer" (1 sec)
4. Paste to customer (2 sec)
5. Repeat for all customer, consistent, no errors
6. Total: 10 seconds, happy customer ✨

---

## Document Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | VINN | 2026-08-26 | ✅ Approved |
| Design Lead | Claude Design | 2026-08-26 | ✅ Integrated |
| Tech Lead | Claude | 2026-08-26 | ✅ Ready |
| Project Manager | VINN | TBD | ⏳ Pending |

---

**Version History:**
- v1.0 (2026-08-26): Initial PRD created
- v2.0 (2026-08-26): Design integration from Claude Design

**Next Review:** After Phase 1 MVP completion

**Contact:** VINN (Product Owner) | Claude (Technical Lead)

---

**END OF PRD**

This document is the complete specification for the Anara Quick Replies Web Application. It combines product requirements, design specifications (from Claude Design), technical architecture, and implementation roadmap into a single comprehensive guide for all stakeholders.
