-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'landlord', 'staff', 'super_admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('unverified', 'pending', 'verified');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('Active', 'Inactive', 'Maintenance', 'Archived');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('Boarding House', 'Apartment', 'Studio', 'Dormitory', 'Commercial', 'Parking', 'Land', 'Mixed Use');

-- CreateEnum
CREATE TYPE "UtilityDefault" AS ENUM ('included', 'metered', 'shared');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('vacant', 'occupied', 'reserved', 'maintenance');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('vacant', 'occupied', 'reserved');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('room', 'bedspace');

-- CreateEnum
CREATE TYPE "TenancyStatus" AS ENUM ('pending', 'checked_in', 'checked_out');

-- CreateEnum
CREATE TYPE "CommentRole" AS ENUM ('tenant', 'caretaker', 'admin');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('draft', 'pending_review', 'pending_signature', 'signed', 'active', 'expired', 'terminated');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('fixed', 'submetered');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'under_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "LandlordAppStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('rent', 'utility', 'penalty', 'combined');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('unpaid', 'partial', 'paid', 'overdue');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'gcash', 'bank_transfer', 'other');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('open', 'in_progress', 'closed', 'converted');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('plumbing', 'electrical', 'structural', 'appliance', 'pest', 'other');

-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('new', 'good', 'fair', 'poor', 'damaged');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('available', 'issued', 'maintenance', 'retired');

-- CreateEnum
CREATE TYPE "InventoryRecordStatus" AS ENUM ('active', 'returned', 'damaged', 'lost');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- CreateEnum
CREATE TYPE "VisitPurpose" AS ENUM ('viewing', 'inspection');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('pending', 'approved', 'scheduled', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('inquiry', 'message', 'visit', 'application', 'contract', 'tenancy', 'billing', 'maintenance', 'system');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('lease', 'id', 'contract', 'receipt', 'incident', 'inventory_form', 'other');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('theft', 'damage', 'medical', 'fire', 'dispute', 'other');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'investigating', 'resolved', 'closed');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'unverified',
    "id_photos" TEXT[],
    "avatar" TEXT,
    "landlord_id" UUID,
    "permissions" TEXT[],
    "position_name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_property_assignments" (
    "staff_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,

    CONSTRAINT "staff_property_assignments_pkey" PRIMARY KEY ("staff_id","property_id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "landlord_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "barangay" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Philippines',
    "amenities" TEXT[],
    "inclusions" TEXT[],
    "images" TEXT[],
    "property_type" "PropertyType" NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'Active',
    "venues" JSONB,
    "emergency_contacts" JSONB,
    "billing_day" INTEGER NOT NULL DEFAULT 1,
    "due_day" INTEGER NOT NULL DEFAULT 5,
    "late_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "utility_default" "UtilityDefault" NOT NULL DEFAULT 'metered',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "total_units" INTEGER NOT NULL DEFAULT 0,
    "occupied_units" INTEGER NOT NULL DEFAULT 0,
    "vacant_units" INTEGER NOT NULL DEFAULT 0,
    "occupancy_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_identifier" TEXT NOT NULL,
    "accommodation_type" "AccommodationType" NOT NULL,
    "room_rent" DECIMAL(12,2),
    "bedspace_rent" DECIMAL(12,2),
    "per_head_rate" DECIMAL(12,2),
    "deposit" DECIMAL(12,2) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "max_occupants" INTEGER NOT NULL,
    "size_sqm" DECIMAL(8,2),
    "features" TEXT[],
    "images" TEXT[],
    "status" "UnitStatus" NOT NULL DEFAULT 'vacant',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_slots" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "slot_number" INTEGER NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'vacant',
    "tenancy_id" UUID,

    CONSTRAINT "unit_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenancies" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "status" "TenancyStatus" NOT NULL DEFAULT 'checked_in',
    "check_in_date" TIMESTAMPTZ,
    "check_out_date" TIMESTAMPTZ,
    "slot_number" INTEGER,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "household_members" JSONB,
    "pd_full_name" TEXT NOT NULL,
    "pd_phone" TEXT NOT NULL,
    "pd_occupation" TEXT NOT NULL,
    "pd_school" TEXT,
    "pd_address" TEXT NOT NULL,
    "pd_emergency_name" TEXT NOT NULL,
    "pd_emergency_phone" TEXT NOT NULL,
    "pd_emergency_relationship" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenancy_comments" (
    "id" UUID NOT NULL,
    "tenancy_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CommentRole" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenancy_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "tenancy_id" UUID,
    "property_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "landlord_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "lock_in_period" INTEGER NOT NULL,
    "monthly_rent" DECIMAL(12,2) NOT NULL,
    "security_deposit" DECIMAL(12,2) NOT NULL,
    "advance_payment" DECIMAL(12,2) NOT NULL,
    "utility_included_in_rent" BOOLEAN NOT NULL DEFAULT false,
    "rate_type" "RateType" NOT NULL DEFAULT 'fixed',
    "terms" TEXT,
    "landlord_signature" TEXT,
    "user_signature" TEXT,
    "signed_at" TIMESTAMPTZ,
    "status" "ContractStatus" NOT NULL DEFAULT 'draft',
    "document_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_applications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "pd_full_name" TEXT NOT NULL,
    "pd_phone" TEXT NOT NULL,
    "pd_occupation" TEXT NOT NULL,
    "pd_school" TEXT,
    "pd_address" TEXT NOT NULL,
    "pd_emergency_name" TEXT NOT NULL,
    "pd_emergency_phone" TEXT NOT NULL,
    "pd_emergency_relationship" TEXT NOT NULL,
    "documents" TEXT[],
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rental_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" UUID NOT NULL,
    "tenancy_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "contract_id" UUID,
    "type" "BillType" NOT NULL,
    "billing_period_start" TIMESTAMPTZ NOT NULL,
    "billing_period_end" TIMESTAMPTZ NOT NULL,
    "rent_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "utility_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penalty_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance_amount" DECIMAL(12,2) NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'unpaid',
    "due_date" TIMESTAMPTZ NOT NULL,
    "utility_breakdown" JSONB,
    "is_auto_generated" BOOLEAN NOT NULL DEFAULT false,
    "receipt_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "tenancy_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" TIMESTAMPTZ NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "proof_image_url" TEXT,
    "recorded_by_user_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID,
    "subject" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reads" (
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("message_id","user_id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "tenancy_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "reported_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'medium',
    "images" TEXT[],
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "assigned_to_user_id" UUID,
    "assigned_by_user_id" UUID,
    "resolution_notes" TEXT,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_updates" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventories" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "serial_number" TEXT,
    "condition" "InventoryCondition" NOT NULL DEFAULT 'good',
    "quantity" INTEGER NOT NULL,
    "available_quantity" INTEGER NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'available',
    "purchase_date" TIMESTAMPTZ,
    "purchase_cost" DECIMAL(12,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_records" (
    "id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "tenancy_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID,
    "issued_by_user_id" UUID NOT NULL,
    "issued_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity_issued" INTEGER NOT NULL DEFAULT 1,
    "issued_condition" "InventoryCondition" NOT NULL,
    "return_date" TIMESTAMPTZ,
    "return_condition" "InventoryCondition",
    "damage_notes" TEXT,
    "penalty_amount" DECIMAL(12,2),
    "deducted_from_deposit" BOOLEAN NOT NULL DEFAULT false,
    "signed_form_url" TEXT,
    "status" "InventoryRecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_requests" (
    "id" UUID NOT NULL,
    "tenancy_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "from_unit_id" UUID NOT NULL,
    "to_unit_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'pending',
    "initiated_by_user_id" UUID NOT NULL,
    "reviewed_by" UUID,
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID,
    "requested_date" TIMESTAMPTZ NOT NULL,
    "requested_time" TEXT NOT NULL,
    "scheduled_date" TIMESTAMPTZ,
    "scheduled_time" TEXT,
    "purpose" "VisitPurpose" NOT NULL DEFAULT 'viewing',
    "status" "VisitStatus" NOT NULL DEFAULT 'pending',
    "assigned_staff_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "visit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID,
    "tenancy_id" UUID,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "reported_by" UUID NOT NULL,
    "date_of_incident" TIMESTAMPTZ NOT NULL,
    "type" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "resolution_notes" TEXT,
    "attachments" TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landlord_applications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_type" TEXT NOT NULL,
    "documents" TEXT[],
    "status" "LandlordAppStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "landlord_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE INDEX "profiles_landlord_id_idx" ON "profiles"("landlord_id");

-- CreateIndex
CREATE INDEX "staff_property_assignments_property_id_idx" ON "staff_property_assignments"("property_id");

-- CreateIndex
CREATE INDEX "properties_landlord_id_idx" ON "properties"("landlord_id");

-- CreateIndex
CREATE INDEX "properties_city_idx" ON "properties"("city");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "properties_latitude_longitude_idx" ON "properties"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "units_property_id_unit_identifier_key" ON "units"("property_id", "unit_identifier");

-- CreateIndex
CREATE INDEX "unit_slots_tenancy_id_idx" ON "unit_slots"("tenancy_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_slots_unit_id_slot_number_key" ON "unit_slots"("unit_id", "slot_number");

-- CreateIndex
CREATE INDEX "tenancies_user_id_status_idx" ON "tenancies"("user_id", "status");

-- CreateIndex
CREATE INDEX "tenancies_property_id_status_idx" ON "tenancies"("property_id", "status");

-- CreateIndex
CREATE INDEX "tenancies_unit_id_status_idx" ON "tenancies"("unit_id", "status");

-- CreateIndex
CREATE INDEX "tenancies_contract_id_idx" ON "tenancies"("contract_id");

-- CreateIndex
CREATE INDEX "tenancies_status_created_at_idx" ON "tenancies"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tenancy_comments_tenancy_id_created_at_idx" ON "tenancy_comments"("tenancy_id", "created_at");

-- CreateIndex
CREATE INDEX "tenancy_comments_user_id_idx" ON "tenancy_comments"("user_id");

-- CreateIndex
CREATE INDEX "contracts_user_id_status_idx" ON "contracts"("user_id", "status");

-- CreateIndex
CREATE INDEX "contracts_landlord_id_status_idx" ON "contracts"("landlord_id", "status");

-- CreateIndex
CREATE INDEX "contracts_property_id_status_idx" ON "contracts"("property_id", "status");

-- CreateIndex
CREATE INDEX "contracts_unit_id_status_idx" ON "contracts"("unit_id", "status");

-- CreateIndex
CREATE INDEX "contracts_application_id_idx" ON "contracts"("application_id");

-- CreateIndex
CREATE INDEX "contracts_tenancy_id_idx" ON "contracts"("tenancy_id");

-- CreateIndex
CREATE INDEX "contracts_status_created_at_idx" ON "contracts"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rental_applications_user_id_created_at_idx" ON "rental_applications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rental_applications_property_id_status_idx" ON "rental_applications"("property_id", "status");

-- CreateIndex
CREATE INDEX "rental_applications_unit_id_status_idx" ON "rental_applications"("unit_id", "status");

-- CreateIndex
CREATE INDEX "rental_applications_status_created_at_idx" ON "rental_applications"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rental_applications_reviewed_by_idx" ON "rental_applications"("reviewed_by");

-- CreateIndex
CREATE INDEX "bills_tenancy_id_status_idx" ON "bills"("tenancy_id", "status");

-- CreateIndex
CREATE INDEX "bills_property_id_status_idx" ON "bills"("property_id", "status");

-- CreateIndex
CREATE INDEX "bills_unit_id_status_idx" ON "bills"("unit_id", "status");

-- CreateIndex
CREATE INDEX "bills_contract_id_idx" ON "bills"("contract_id");

-- CreateIndex
CREATE INDEX "bills_status_due_date_idx" ON "bills"("status", "due_date");

-- CreateIndex
CREATE INDEX "bills_due_date_status_idx" ON "bills"("due_date", "status");

-- CreateIndex
CREATE INDEX "bills_type_status_idx" ON "bills"("type", "status");

-- CreateIndex
CREATE INDEX "bills_created_at_idx" ON "bills"("created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_bill_id_created_at_idx" ON "payments"("bill_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_tenancy_id_created_at_idx" ON "payments"("tenancy_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_recorded_by_user_id_idx" ON "payments"("recorded_by_user_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date" DESC);

-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE INDEX "inquiries_user_id_created_at_idx" ON "inquiries"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inquiries_property_id_status_idx" ON "inquiries"("property_id", "status");

-- CreateIndex
CREATE INDEX "inquiries_status_created_at_idx" ON "inquiries"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inquiries_unit_id_idx" ON "inquiries"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_inquiry_id_key" ON "conversations"("inquiry_id");

-- CreateIndex
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants"("user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "message_reads_user_id_idx" ON "message_reads"("user_id");

-- CreateIndex
CREATE INDEX "tickets_reported_by_user_id_status_idx" ON "tickets"("reported_by_user_id", "status");

-- CreateIndex
CREATE INDEX "tickets_property_id_status_idx" ON "tickets"("property_id", "status");

-- CreateIndex
CREATE INDEX "tickets_tenancy_id_status_idx" ON "tickets"("tenancy_id", "status");

-- CreateIndex
CREATE INDEX "tickets_assigned_to_user_id_status_idx" ON "tickets"("assigned_to_user_id", "status");

-- CreateIndex
CREATE INDEX "tickets_priority_created_at_idx" ON "tickets"("priority", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tickets_category_created_at_idx" ON "tickets"("category", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tickets_created_at_idx" ON "tickets"("created_at" DESC);

-- CreateIndex
CREATE INDEX "tickets_unit_id_idx" ON "tickets"("unit_id");

-- CreateIndex
CREATE INDEX "tickets_assigned_by_user_id_idx" ON "tickets"("assigned_by_user_id");

-- CreateIndex
CREATE INDEX "ticket_updates_ticket_id_timestamp_idx" ON "ticket_updates"("ticket_id", "timestamp");

-- CreateIndex
CREATE INDEX "ticket_updates_user_id_idx" ON "ticket_updates"("user_id");

-- CreateIndex
CREATE INDEX "inventories_property_id_status_idx" ON "inventories"("property_id", "status");

-- CreateIndex
CREATE INDEX "inventories_property_id_condition_idx" ON "inventories"("property_id", "condition");

-- CreateIndex
CREATE INDEX "inventories_property_id_item_name_idx" ON "inventories"("property_id", "item_name");

-- CreateIndex
CREATE INDEX "inventory_records_tenancy_id_status_idx" ON "inventory_records"("tenancy_id", "status");

-- CreateIndex
CREATE INDEX "inventory_records_property_id_status_idx" ON "inventory_records"("property_id", "status");

-- CreateIndex
CREATE INDEX "inventory_records_inventory_item_id_status_idx" ON "inventory_records"("inventory_item_id", "status");

-- CreateIndex
CREATE INDEX "inventory_records_issued_by_user_id_issued_date_idx" ON "inventory_records"("issued_by_user_id", "issued_date" DESC);

-- CreateIndex
CREATE INDEX "inventory_records_updated_at_idx" ON "inventory_records"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "inventory_records_unit_id_idx" ON "inventory_records"("unit_id");

-- CreateIndex
CREATE INDEX "transfer_requests_tenancy_id_status_idx" ON "transfer_requests"("tenancy_id", "status");

-- CreateIndex
CREATE INDEX "transfer_requests_property_id_status_idx" ON "transfer_requests"("property_id", "status");

-- CreateIndex
CREATE INDEX "transfer_requests_initiated_by_user_id_created_at_idx" ON "transfer_requests"("initiated_by_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transfer_requests_from_unit_id_to_unit_id_idx" ON "transfer_requests"("from_unit_id", "to_unit_id");

-- CreateIndex
CREATE INDEX "transfer_requests_created_at_idx" ON "transfer_requests"("created_at" DESC);

-- CreateIndex
CREATE INDEX "transfer_requests_to_unit_id_idx" ON "transfer_requests"("to_unit_id");

-- CreateIndex
CREATE INDEX "transfer_requests_reviewed_by_idx" ON "transfer_requests"("reviewed_by");

-- CreateIndex
CREATE INDEX "visit_requests_user_id_created_at_idx" ON "visit_requests"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "visit_requests_property_id_status_idx" ON "visit_requests"("property_id", "status");

-- CreateIndex
CREATE INDEX "visit_requests_assigned_staff_id_status_idx" ON "visit_requests"("assigned_staff_id", "status");

-- CreateIndex
CREATE INDEX "visit_requests_scheduled_date_scheduled_time_idx" ON "visit_requests"("scheduled_date", "scheduled_time");

-- CreateIndex
CREATE INDEX "visit_requests_unit_id_idx" ON "visit_requests"("unit_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "documents_property_id_idx" ON "documents"("property_id");

-- CreateIndex
CREATE INDEX "documents_unit_id_idx" ON "documents"("unit_id");

-- CreateIndex
CREATE INDEX "documents_tenancy_id_idx" ON "documents"("tenancy_id");

-- CreateIndex
CREATE INDEX "documents_uploaded_by_idx" ON "documents"("uploaded_by");

-- CreateIndex
CREATE INDEX "incident_reports_property_id_idx" ON "incident_reports"("property_id");

-- CreateIndex
CREATE INDEX "incident_reports_reported_by_idx" ON "incident_reports"("reported_by");

-- CreateIndex
CREATE INDEX "landlord_applications_user_id_idx" ON "landlord_applications"("user_id");

-- CreateIndex
CREATE INDEX "landlord_applications_status_idx" ON "landlord_applications"("status");

-- CreateIndex
CREATE INDEX "landlord_applications_reviewed_by_idx" ON "landlord_applications"("reviewed_by");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_property_assignments" ADD CONSTRAINT "staff_property_assignments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_property_assignments" ADD CONSTRAINT "staff_property_assignments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_slots" ADD CONSTRAINT "unit_slots_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_slots" ADD CONSTRAINT "unit_slots_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancies" ADD CONSTRAINT "tenancies_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancy_comments" ADD CONSTRAINT "tenancy_comments_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenancy_comments" ADD CONSTRAINT "tenancy_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "rental_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_applications" ADD CONSTRAINT "rental_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_applications" ADD CONSTRAINT "rental_applications_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_applications" ADD CONSTRAINT "rental_applications_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_applications" ADD CONSTRAINT "rental_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_updates" ADD CONSTRAINT "ticket_updates_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_updates" ADD CONSTRAINT "ticket_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_from_unit_id_fkey" FOREIGN KEY ("from_unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_to_unit_id_fkey" FOREIGN KEY ("to_unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_requests" ADD CONSTRAINT "visit_requests_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landlord_applications" ADD CONSTRAINT "landlord_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landlord_applications" ADD CONSTRAINT "landlord_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =============================================================================
-- Raw-SQL additions to the initial migration (20260830100425_init).
--
-- This file is the readable, reviewable source of truth for everything Prisma
-- cannot express in schema.prisma. Its contents are appended verbatim to the
-- end of `prisma/migrations/20260830100425_init/migration.sql`, which is what
-- Prisma Migrate actually executes. Keep the two in sync: editing this file
-- alone changes nothing.
--
-- Contents:
--   1. Three partial UNIQUE indexes (Mongoose partial-unique indexes)
--   2. refresh_property_metrics() + trigger (replaces the four Unit.post hooks)
--   3. 27 CHECK constraints (Mongoose min/max validators)
--   4. citext on profiles.email (Mongoose lowercase:true + unique)
--   5. profiles.id -> auth.users.id FK (Supabase-owned schema)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Partial unique indexes
--    Prisma cannot express a WHERE clause on a unique index, so these three
--    Mongoose partial-unique indexes must be created in raw SQL or the
--    uniqueness guarantees carried over from Mongo are silently lost.
-- -----------------------------------------------------------------------------

-- Bill.ts: one auto-generated bill per tenancy/type/billing period.
CREATE UNIQUE INDEX "bills_auto_period_uniq"
  ON "bills" ("tenancy_id", "type", "billing_period_start", "billing_period_end")
  WHERE "is_auto_generated";

-- RentalApplication.ts: one live application per (user, unit).
CREATE UNIQUE INDEX "rental_applications_active_uniq"
  ON "rental_applications" ("user_id", "unit_id")
  WHERE "status" IN ('pending', 'under_review');

-- Inventory.ts: serial numbers unique per property, ignoring null/blank serials.
-- NOTE: the table is `inventories` (Prisma pluralised the `Inventory` model),
-- not `inventory`.
CREATE UNIQUE INDEX "inventory_serial_uniq"
  ON "inventories" ("property_id", "serial_number")
  WHERE "serial_number" IS NOT NULL AND "serial_number" <> '';


-- -----------------------------------------------------------------------------
-- 2. Property occupancy metrics trigger
--
--    Replaces the four UnitSchema.post() hooks (save / findOneAndUpdate /
--    findOneAndDelete / deleteOne) in the Mongoose model. Doing it in the
--    database also closes the deleteMany gap the original code documents as a
--    known limitation: a bulk delete bypassed the document middleware and left
--    properties.total_units stale. A row-level trigger cannot be bypassed.
--
--    Two deliberate deviations from the plan's draft:
--
--    a) The draft used
--         target UUID := COALESCE(NEW.property_id, OLD.property_id);
--       In PL/pgSQL, NEW is unassigned during DELETE and OLD is unassigned
--       during INSERT; touching the unassigned record raises
--       'record "new" is not assigned yet', so the draft would have failed on
--       every DELETE. TG_OP is checked instead.
--
--    b) The draft refreshed a single property. An UPDATE that moves a unit
--       between properties has to refresh both the old and the new one, or the
--       source property keeps stale counts forever. Both ids are collected and
--       de-duplicated.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION refresh_property_metrics() RETURNS TRIGGER AS $$
DECLARE
  targets UUID[] := ARRAY[]::UUID[];
  target  UUID;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    targets := targets || OLD.property_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    targets := targets || NEW.property_id;
  END IF;

  FOR target IN
    SELECT DISTINCT t FROM unnest(targets) AS t WHERE t IS NOT NULL
  LOOP
    UPDATE properties p SET
      total_units    = s.total,
      occupied_units = s.occupied,
      vacant_units   = s.vacant,
      occupancy_rate = CASE WHEN s.total > 0
                            THEN ROUND((s.occupied::numeric / s.total) * 100, 2)
                            ELSE 0 END
    FROM (
      SELECT
        COUNT(*)                                    AS total,
        COUNT(*) FILTER (WHERE status = 'occupied') AS occupied,
        COUNT(*) FILTER (WHERE status = 'vacant')   AS vacant
      FROM units WHERE property_id = target
    ) s
    WHERE p.id = target;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER units_refresh_property_metrics
  AFTER INSERT OR DELETE OR UPDATE OF status, property_id ON units
  FOR EACH ROW EXECUTE FUNCTION refresh_property_metrics();


-- -----------------------------------------------------------------------------
-- 3. CHECK constraints for the Mongoose min/max validators
--    27 validators that have no Prisma equivalent and would otherwise be
--    silently unenforced in Postgres, letting invalid data (negative rent,
--    zero-capacity units) become insertable post-cutover.
--    Nullable columns are guarded with `IS NULL OR`.
-- -----------------------------------------------------------------------------

ALTER TABLE properties
  ADD CONSTRAINT properties_billing_day_check CHECK (billing_day BETWEEN 1 AND 31),
  ADD CONSTRAINT properties_due_day_check CHECK (due_day BETWEEN 1 AND 31),
  ADD CONSTRAINT properties_late_fee_percent_check CHECK (late_fee_percent >= 0 AND late_fee_percent <= 100);

ALTER TABLE units
  ADD CONSTRAINT units_room_rent_check CHECK (room_rent IS NULL OR room_rent >= 0),
  ADD CONSTRAINT units_bedspace_rent_check CHECK (bedspace_rent IS NULL OR bedspace_rent >= 0),
  ADD CONSTRAINT units_per_head_rate_check CHECK (per_head_rate IS NULL OR per_head_rate >= 0),
  ADD CONSTRAINT units_deposit_check CHECK (deposit >= 0),
  ADD CONSTRAINT units_size_sqm_check CHECK (size_sqm IS NULL OR size_sqm >= 0),
  ADD CONSTRAINT units_capacity_check CHECK (capacity >= 1),
  ADD CONSTRAINT units_max_occupants_check CHECK (max_occupants >= 1);

ALTER TABLE contracts
  ADD CONSTRAINT contracts_lock_in_period_check CHECK (lock_in_period >= 0),
  ADD CONSTRAINT contracts_monthly_rent_check CHECK (monthly_rent >= 0),
  ADD CONSTRAINT contracts_security_deposit_check CHECK (security_deposit >= 0),
  ADD CONSTRAINT contracts_advance_payment_check CHECK (advance_payment >= 0);

ALTER TABLE bills
  ADD CONSTRAINT bills_rent_amount_check CHECK (rent_amount >= 0),
  ADD CONSTRAINT bills_utility_amount_check CHECK (utility_amount >= 0),
  ADD CONSTRAINT bills_penalty_amount_check CHECK (penalty_amount >= 0),
  ADD CONSTRAINT bills_total_amount_check CHECK (total_amount >= 0),
  ADD CONSTRAINT bills_paid_amount_check CHECK (paid_amount >= 0),
  ADD CONSTRAINT bills_balance_amount_check CHECK (balance_amount >= 0);

ALTER TABLE payments
  ADD CONSTRAINT payments_amount_check CHECK (amount >= 0.01);

ALTER TABLE tenancies
  ADD CONSTRAINT tenancies_slot_number_check CHECK (slot_number IS NULL OR slot_number >= 1);

ALTER TABLE inventories
  ADD CONSTRAINT inventories_quantity_check CHECK (quantity >= 1),
  ADD CONSTRAINT inventories_available_quantity_check CHECK (available_quantity >= 0),
  ADD CONSTRAINT inventories_purchase_cost_check CHECK (purchase_cost IS NULL OR purchase_cost >= 0);

ALTER TABLE inventory_records
  ADD CONSTRAINT inventory_records_quantity_issued_check CHECK (quantity_issued >= 1),
  ADD CONSTRAINT inventory_records_penalty_amount_check CHECK (penalty_amount IS NULL OR penalty_amount >= 0);


-- -----------------------------------------------------------------------------
-- 4. Case-insensitive email uniqueness
--
--    User.ts had `lowercase: true` in front of its unique index. A bare
--    `email TEXT UNIQUE` in Postgres is case-sensitive, so A@x.com and
--    a@x.com could coexist post-cutover -- a duplicate-account and
--    failed-login-match risk that did not exist under Mongo.
--
--    Retyping the column to citext makes the UNIQUE index Prisma already
--    generated (profiles_email_key) case-insensitive; Postgres rebuilds that
--    index automatically as part of the type change.
--
--    Supabase convention: extensions live in the `extensions` schema, never
--    `public`. The type is written schema-qualified so the statement does not
--    depend on `extensions` being on the migration engine's search_path.
--    CREATE SCHEMA IF NOT EXISTS keeps the migration replayable on a plain
--    Postgres shadow database, which has no `extensions` schema.
-- -----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
ALTER TABLE profiles ALTER COLUMN email TYPE extensions.citext;


-- -----------------------------------------------------------------------------
-- 5. profiles.id -> auth.users.id
--
--    Prisma does not manage the Supabase-owned `auth` schema, so without this
--    profiles.id is a bare UUID with no referential link to the Supabase Auth
--    user it names, and deleting an auth user leaves an orphaned profile.
--    ON DELETE CASCADE is deliberate: a profiles row has no meaning once its
--    owning auth.users row is gone.
--
--    Guarded on auth.users existing so the migration still replays on a plain
--    Postgres shadow database (which has no `auth` schema) -- without the
--    guard, every future `prisma migrate dev` in this repo would fail during
--    its shadow-database drift check. On the real Supabase database the branch
--    is always taken; a genuine failure to add the constraint still raises.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
END
$$;
