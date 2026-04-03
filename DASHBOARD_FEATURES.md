# RentDito Dashboard Features Documentation

## Overview
RentDito has a multi-level hierarchical dashboard system with three main user types: Super Admin, Landlord (Primary), and Secondary Landlord. Each level has specific modules and features.

---

## 1. Super Admin Dashboard
**Platform-level management and oversight**

### Core Features
- **User Management**
  - User directory with filtering (landlords, tenants, admins)
  - User account status management (active, suspended, banned)
  - Impersonation/login as user for support
  - User verification status tracking
  - Role assignment and permission management
  - Delete/archive user accounts with data handling

- **Property & Listings Management**
  - View all properties with filtering and search
  - Property approval/moderation queue
  - Flag inappropriate listings
  - Featured/promoted property management
  - Bulk edit property status (active, inactive, delisted)
  - Property performance analytics

- **Financial Management**
  - Transaction/payment monitoring dashboard
  - Revenue analytics and commission tracking
  - Refund/dispute handling
  - Payment method verification
  - Invoice generation and management
  - Financial reports and P&L statements

- **Reporting & Analytics**
  - Platform KPIs (active users, total properties, revenue, bookings)
  - User growth trends
  - Property performance metrics
  - Popular locations/categories
  - Seasonal trends in bookings
  - Conversion rate tracking

- **Moderation & Compliance**
  - Report management (user/property reports)
  - Content moderation (image approval queue)
  - Compliance tracking (terms of service, tax documentation)
  - Audit logs (full activity logging)

- **Communication & Support**
  - Bulk messaging (announcements to users/landlords)
  - Support ticket system
  - Email templates for communications
  - Notification center and delivery tracking

- **System Management**
  - Platform settings and configuration
  - Feature flags for A/B testing
  - Database management (backups, integrity checks)
  - System health monitoring (uptime, error rates, performance)
  - Application logs (errors and warnings)

- **Security & Fraud Prevention**
  - IP/Device tracking for suspicious activity
  - Fraud detection and flagging
  - Real-time security alerts
  - Admin-initiated password resets
  - 2FA management for users

- **Advanced Features**
  - Promotional campaigns (discounts, promo codes, referrals)
  - Category/Amenity management
  - SEO management for listings
  - API management and usage monitoring
  - Role-based admin levels (Super Admin, Admin, Moderator)
  - Global activity timeline
  - Advanced search with multi-criteria filters

---

## 2. Landlord Dashboard (Primary Landlord)
**Overall management of landlord's properties and team**

### 2.1 Admin Module
- Landlord profile and account settings
- Dashboard overview (key metrics: properties, units, bookings, revenue)
- Secondary landlord management (invite, assign permissions, deactivate)
- Team settings and hierarchical permission management
- Document management (contracts, lease agreements, compliance docs)
- Banking/payment settings and account details
- Notifications and email preferences
- Account activity logs and security settings

### 2.2 Properties Module
- Property portfolio view and management
- Add/edit/delete properties
- Property details (address, description, rules, policies)
- Property photos and document uploads
- Property status management (active, inactive, archived)
- Bulk property operations
- Property-level analytics and performance

### 2.3 Units Module
- Unit/room management per property
- Unit details (size, capacity, amenities, pricing)
- Unit pricing and availability calendar
- Unit occupancy tracking
- Unit status management
- Unit photos and specifications
- Rate management and seasonal pricing

### 2.4 Bookings Module
- View all bookings across properties
- Booking status tracking (pending, confirmed, completed, cancelled)
- Calendar view of bookings
- Booking details and tenant information
- Check-in/check-out management
- Cancellation and modification requests
- Booking analytics and occupancy rates

### 2.5 Financial Module
- Revenue dashboard (total earnings, pending payments)
- Payment tracking and reconciliation
- Commission fees overview
- Financial reports and statements
- Expense tracking
- Invoicing and billing
- Payment method management

### 2.6 Agents Module
- Agent profiles and contact information
- Assign agents to properties
- Agent performance metrics (bookings, revenue, ratings)
- Agent commission tracking and payouts
- Agent availability and schedule management
- Agent activity logs and history
- Agent contact details and bio

### 2.7 Maintenance Module
- Maintenance request tracking and status
- Work order management and assignment
- Assign tasks to maintenance staff
- Maintenance schedule and calendar
- Maintenance cost tracking per property
- Vendor/contractor management
- Maintenance history and reports by property

---

## 3. Secondary Landlord Dashboard
**Sub-management of assigned properties and operations**

### 3.1 Admin Module
- Secondary landlord profile and settings
- Dashboard overview (assigned properties, bookings, revenue share)
- Permission and role management information (view-only)
- Document access (assigned documents only)
- Account activity logs

### 3.2 Properties Module (Assigned Only)
- View assigned properties (no add/delete)
- Edit assigned property details
- Property photos and documents
- Property status visibility
- Assigned property analytics

### 3.3 Units Module (Assigned Only)
- Manage units in assigned properties
- Edit unit details and pricing
- Unit availability calendar management
- Unit occupancy tracking
- Unit status management

### 3.4 Bookings Module (Assigned Only)
- View bookings for assigned properties
- Booking status tracking
- Check-in/check-out management
- Booking details and tenant communication
- Occupancy reports for assigned properties

### 3.5 Financial Module (Limited)
- Revenue dashboard for assigned properties
- Payment tracking (assigned properties only)
- Commission information (view-only)
- Financial reports for assigned properties

### 3.6 Agents Module (Limited)
- View agents assigned to their properties
- Agent performance metrics (their assigned properties)
- Agent contact information and availability
- View agent activity logs

### 3.7 Maintenance Module (Assigned Only)
- Maintenance requests for assigned properties
- Work order management for assigned properties
- Assign tasks to maintenance staff
- Maintenance cost tracking for assigned properties
- Maintenance history per assigned property

### 3.8 Inventory Module
**Amenities lent by management to tenants**
- Inventory of amenities in assigned properties
- Amenities availability tracking
- Assign amenities to units
- Amenity handover logs (tenant check-in/check-out)
- Amenity condition tracking and damage reports
- Amenity return verification
- Inventory reports and reconciliation

---

## 4. Tenant Dashboard
**Booking and property management from tenant perspective**

### Features
- Browse and search properties
- View property details and amenities
- Booking management (view, cancel, modify)
- Payment history and invoices
- Amenity handover documentation
- Support ticket submission
- Profile and payment method management
- Review and rating system
- Notification and preferences

---

## 5. Admin User Roles & Permissions

### Super Admin
- Full platform access
- User and financial management
- System configuration and monitoring
- Moderation and compliance oversight
- Audit log access

### Landlord (Primary)
- Full control over their properties
- Team management (secondary landlords, agents, maintenance staff)
- Financial reports for their properties
- Booking and unit management
- Maintenance and inventory oversight

### Secondary Landlord
- Limited to assigned properties
- Can manage units and bookings
- Cannot add/delete properties
- View-only financial access
- Inventory management of amenities
- Maintenance task execution

### Agent (read from Landlord context)
- Property viewing and showing
- Booking inquiry handling
- Client communication
- Commission tracking
- Limited to assigned properties

### Maintenance Staff (read from Landlord context)
- Maintenance request execution
- Work order completion
- Inventory/amenity tracking
- Cannot access financial data

---

## 6. Key Features Implementation Notes

### Inventory Module (Amenities)
The Inventory module specifically manages **amenities lent by management to tenants**:
- Asset management of physical amenities
- Handover and return tracking
- Condition assessment (upon handover and return)
- Damage liability tracking
- Inventory reconciliation reports
- Amenity availability calendar
- Tenant acknowledgment and sign-off documentation

### Secondary Landlord Limitations
- **Cannot**: Add properties, delete properties, manage primary landlord account
- **Can**: Manage day-to-day operations within assigned properties
- **Access**: Limited to metrics and data for assigned properties only
- **Reporting**: View reports only for their scope of work

### Financial Model
- **Super Admin**: Sees all transactions and platform revenue
- **Landlord**: Sees own revenue minus commissions
- **Secondary Landlord**: Sees commission share for assigned properties (if applicable)

---

## 7. Future Enhancements
- Mobile app for on-the-go management
- Real-time notifications and alerts
- Advanced reporting with custom date ranges
- Integration with payment gateways
- Automated invoice generation
- SMS/WhatsApp notifications
- Video tour integration
- Calendar synchronization
- Document e-signature capabilities
- Insurance claim integration
