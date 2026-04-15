# RentDito API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Table of Contents
1. [Authentication](#authentication-endpoints)
2. [User Management](#user-management)
3. [Landlord Applications](#landlord-applications)
4. [Team Management](#team-management)

---

## Authentication Endpoints

### Register
Create a new user account.

**Endpoint:** `POST /auth/register`

**Access:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!"
}
```

**Validation:**
- `name`: Required, 2-100 characters
- `email`: Required, valid email format
- `phone`: Optional
- `password`: Required, minimum 8 characters
- `confirmPassword`: Required, must match password

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "user",
      "status": "active",
      "verificationStatus": "unverified",
      "idPhotos": [],
      "createdAt": "2024-04-13T10:00:00.000Z",
      "updatedAt": "2024-04-13T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `400`: Validation error
- `409`: Email already registered

---

### Login
Authenticate and receive access tokens.

**Endpoint:** `POST /auth/login`

**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `403`: Account suspended

---

### Refresh Token
Get a new access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Access:** Public

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

**Error Responses:**
- `401`: Invalid or expired refresh token

---

### Forgot Password
Request a password reset link.

**Endpoint:** `POST /auth/forgot-password`

**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "If that email is registered, a reset link has been sent."
}
```

**Note:** Always returns success for security (doesn't reveal if email exists)

---

### Reset Password
Reset password using token from email.

**Endpoint:** `POST /auth/reset-password`

**Access:** Public

**Request Body:**
```json
{
  "token": "abc123def456...",
  "password": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Password reset successful. You can now log in with your new password."
}
```

**Error Responses:**
- `400`: Invalid or expired token, validation error

---

### Logout
Invalidate refresh token.

**Endpoint:** `POST /auth/logout`

**Access:** Authenticated

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

## User Management

### Get Current User
Get authenticated user's profile.

**Endpoint:** `GET /users/me`

**Access:** Authenticated

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "user",
    "status": "active",
    "verificationStatus": "unverified",
    "idPhotos": [],
    "avatar": "https://cloudinary.com/...",
    "activeTenancy": null,
    "createdAt": "2024-04-13T10:00:00.000Z",
    "updatedAt": "2024-04-13T10:00:00.000Z"
  }
}
```

---

### Update Profile
Update user profile information.

**Endpoint:** `PATCH /users/me`

**Access:** Authenticated

**Request Body:**
```json
{
  "name": "John Updated Doe",
  "phone": "+1987654321"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Profile updated.",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Updated Doe",
    "email": "john@example.com",
    "phone": "+1987654321",
    "role": "user"
  }
}
```

---

### Change Password
Change user password.

**Endpoint:** `PATCH /users/me/password`

**Access:** Authenticated

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Validation:**
- `currentPassword`: Required
- `newPassword`: Required, minimum 8 characters

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Password changed successfully."
}
```

**Error Responses:**
- `400`: Current password incorrect, validation error

---

### Upload Avatar
Upload profile picture.

**Endpoint:** `POST /users/me/avatar`

**Access:** Authenticated

**Content-Type:** `multipart/form-data`

**Form Data:**
- `avatar`: Image file (JPG, PNG, GIF)

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Avatar updated.",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "avatar": "https://cloudinary.com/..."
  }
}
```

---

### Submit Verification
Upload ID photos for account verification.

**Endpoint:** `POST /users/me/verify`

**Access:** Authenticated

**Content-Type:** `multipart/form-data`

**Form Data:**
- `idPhotos`: Multiple image files

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Verification documents submitted. Review is pending.",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "verificationStatus": "pending",
    "idPhotos": [
      "https://cloudinary.com/id1.jpg",
      "https://cloudinary.com/id2.jpg"
    ]
  }
}
```

---

## Landlord Applications

### Submit Application
Apply to become a landlord.

**Endpoint:** `POST /landlord-applications`

**Access:** Authenticated (role: user)

**Request Body:**
```json
{
  "businessName": "ABC Properties LLC",
  "businessAddress": "123 Main St, City, State 12345",
  "taxId": "12-3456789",
  "propertyCount": 5,
  "description": "I own multiple rental properties..."
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Application submitted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "businessName": "ABC Properties LLC",
    "businessAddress": "123 Main St, City, State 12345",
    "taxId": "12-3456789",
    "propertyCount": 5,
    "description": "I own multiple rental properties...",
    "status": "pending",
    "createdAt": "2024-04-13T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Already have pending/approved application

---

### Get Own Application
Retrieve current user's landlord application.

**Endpoint:** `GET /landlord-applications/me`

**Access:** Authenticated

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "businessName": "ABC Properties LLC",
    "status": "pending",
    "createdAt": "2024-04-13T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `404`: No application found

---

### List All Applications (Admin)
Get all landlord applications.

**Endpoint:** `GET /landlord-applications`

**Access:** Authenticated (role: super_admin)

**Query Parameters:**
- `status`: Filter by status (pending, approved, rejected)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "userId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "businessName": "ABC Properties LLC",
      "status": "pending",
      "createdAt": "2024-04-13T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

### Approve Application (Admin)
Approve a landlord application and promote user.

**Endpoint:** `PATCH /landlord-applications/:id/approve`

**Access:** Authenticated (role: super_admin)

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Application approved. User promoted to landlord.",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "approved",
    "reviewedBy": "507f1f77bcf86cd799439099",
    "reviewedAt": "2024-04-13T11:00:00.000Z"
  }
}
```

---

### Reject Application (Admin)
Reject a landlord application.

**Endpoint:** `PATCH /landlord-applications/:id/reject`

**Access:** Authenticated (role: super_admin)

**Request Body:**
```json
{
  "rejectionReason": "Insufficient documentation provided"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Application rejected.",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "rejected",
    "rejectionReason": "Insufficient documentation provided",
    "reviewedBy": "507f1f77bcf86cd799439099",
    "reviewedAt": "2024-04-13T11:00:00.000Z"
  }
}
```

---

## Team Management

### List Team Members
Get all team members for landlord.

**Endpoint:** `GET /team`

**Access:** Authenticated (role: landlord, staff)

**Success Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Staff Member",
      "email": "staff@example.com",
      "role": "staff",
      "positionName": "Property Manager",
      "permissions": ["dashboard", "properties", "tenants"],
      "assignedPropertyIds": [],
      "createdAt": "2024-04-13T10:00:00.000Z"
    }
  ]
}
```

---

### Invite Staff Member
Invite a new staff member.

**Endpoint:** `POST /team/invite`

**Access:** Authenticated (role: landlord)

**Request Body:**
```json
{
  "email": "newstaff@example.com",
  "name": "New Staff Member",
  "positionName": "Property Manager",
  "permissions": ["dashboard", "properties", "tenants"]
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Staff member invited successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "New Staff Member",
    "email": "newstaff@example.com",
    "role": "staff",
    "positionName": "Property Manager",
    "permissions": ["dashboard", "properties", "tenants"],
    "landlordId": "507f1f77bcf86cd799439011"
  }
}
```

**Error Responses:**
- `400`: Email already exists
- `403`: Insufficient permissions

---

### Update Staff Member
Update staff member details.

**Endpoint:** `PATCH /team/:id`

**Access:** Authenticated (role: landlord)

**Request Body:**
```json
{
  "name": "Updated Name",
  "positionName": "Senior Property Manager"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Staff member updated",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Updated Name",
    "positionName": "Senior Property Manager"
  }
}
```

---

### Update Staff Permissions
Update staff member permissions.

**Endpoint:** `PATCH /team/:id/permissions`

**Access:** Authenticated (role: landlord)

**Request Body:**
```json
{
  "permissions": ["dashboard", "properties", "tenants", "financials"]
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Permissions updated",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "permissions": ["dashboard", "properties", "tenants", "financials"]
  }
}
```

---

### Update Staff Properties
Assign properties to staff member.

**Endpoint:** `PATCH /team/:id/properties`

**Access:** Authenticated (role: landlord)

**Request Body:**
```json
{
  "assignedPropertyIds": ["507f1f77bcf86cd799439020", "507f1f77bcf86cd799439021"]
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Assigned properties updated",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "assignedPropertyIds": ["507f1f77bcf86cd799439020", "507f1f77bcf86cd799439021"]
  }
}
```

---

### Remove Staff Member
Remove a staff member from team.

**Endpoint:** `DELETE /team/:id`

**Access:** Authenticated (role: landlord)

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Staff member removed"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "status": "error",
  "message": "Error description here"
}
```

### Common HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

---

## Role-Based Access Control (RBAC)

### Roles
- `user`: Regular tenant/applicant
- `landlord`: Property owner
- `staff`: Landlord's team member
- `super_admin`: Platform administrator

### Permission Matrix

| Endpoint | user | landlord | staff | super_admin |
|----------|------|----------|-------|-------------|
| Auth endpoints | ✓ | ✓ | ✓ | ✓ |
| /users/me | ✓ | ✓ | ✓ | ✓ |
| /landlord-applications (POST) | ✓ | ✗ | ✗ | ✗ |
| /landlord-applications (GET all) | ✗ | ✗ | ✗ | ✓ |
| /landlord-applications/approve | ✗ | ✗ | ✗ | ✓ |
| /team | ✗ | ✓ | ✓ | ✓ |
| /team/invite | ✗ | ✓ | ✗ | ✓ |
| /team/:id (UPDATE/DELETE) | ✗ | ✓ | ✗ | ✓ |

---

## Rate Limiting

Rate limiting may be applied to prevent abuse:
- Login attempts: 5 per 15 minutes per IP
- Registration: 3 per hour per IP
- Password reset: 3 per hour per IP

---

## Changelog

### Version 1.0.0 (2024-04-13)
- Initial API release
- Authentication system
- User management
- Landlord applications
- Team management
- RBAC implementation
