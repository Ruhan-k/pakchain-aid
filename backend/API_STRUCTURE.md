# Backend API Structure for PakChain Aid

This document describes the REST API endpoints that your backend must implement to work with the frontend.

---

## Base URL

All endpoints are prefixed with `/api`:
- Production: `https://pakchain-aid-api.azurewebsites.net/api`
- Local: `http://localhost:3000/api`

---

## Authentication

Most endpoints require authentication via Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are obtained from the `/api/auth/signin` or `/api/auth/verify-otp` endpoints.

---

## Endpoints

### Auth Endpoints

#### `POST /api/auth/signin`
Sign in with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {}
  },
  "token": "jwt-token-here"
}
```

**Error Response:**
```json
{
  "message": "Invalid credentials",
  "code": "401"
}
```

---

#### `POST /api/auth/send-otp`
Send OTP code to user's email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "display_name": "John Doe"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully"
}
```

---

#### `POST /api/auth/verify-otp`
Verify OTP code and sign in user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "token": "123456",
  "type": "email"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {}
  },
  "token": "jwt-token-here"
}
```

---

#### `POST /api/auth/update-user`
Update user profile or password.

**Request Body:**
```json
{
  "password": "newpassword123",
  "data": {
    "display_name": "John Doe"
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "display_name": "John Doe"
    }
  }
}
```

---

#### `POST /api/auth/signout`
Sign out the current user.

**Response:**
```json
{
  "message": "Signed out successfully"
}
```

---

### Campaigns Endpoints

#### `GET /api/campaigns`
Get all campaigns with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `inactive`, `completed`)
- `order` (optional): Sort order (e.g., `created_at.desc`, `is_featured.desc`)
- `limit` (optional): Limit number of results

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Campaign Title",
      "description": "Campaign description",
      "goal_amount": "1000000000000000000",
      "current_amount": "500000000000000000",
      "image_url": "https://...",
      "status": "active",
      "is_featured": true,
      "receiving_wallet_address": "0x...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /api/campaigns`
Create a new campaign (admin only).

**Request Body:**
```json
{
  "title": "Campaign Title",
  "description": "Campaign description",
  "goal_amount": "1000000000000000000",
  "image_url": "https://...",
  "status": "active",
  "is_featured": false,
  "receiving_wallet_address": "0x..."
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Campaign Title",
    ...
  }
}
```

---

#### `PATCH /api/campaigns?id=uuid`
Update a campaign (admin only).

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "completed",
  ...
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Updated Title",
    ...
  }
}
```

---

#### `DELETE /api/campaigns?id=uuid`
Delete a campaign (admin only).

**Response:**
```json
{
  "message": "Campaign deleted successfully"
}
```

---

### Donations Endpoints

#### `GET /api/donations`
Get all donations with optional filtering.

**Query Parameters:**
- `campaign_id` (optional): Filter by campaign ID
- `donor_wallet` (optional): Filter by donor wallet address
- `status` (optional): Filter by status (`pending`, `confirmed`, `failed`)
- `order` (optional): Sort order (e.g., `created_at.desc`, `amount.desc`)
- `limit` (optional): Limit number of results

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "donor_wallet": "0x...",
      "amount": "100000000000000000",
      "transaction_hash": "0x...",
      "block_number": 12345,
      "timestamp_on_chain": 1234567890,
      "status": "confirmed",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /api/donations`
Create a new donation record.

**Request Body:**
```json
{
  "campaign_id": "uuid",
  "donor_wallet": "0x...",
  "amount": "100000000000000000",
  "transaction_hash": "0x...",
  "block_number": 12345,
  "timestamp_on_chain": 1234567890,
  "status": "confirmed"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "campaign_id": "uuid",
    ...
  }
}
```

---

#### `PATCH /api/donations?id=uuid`
Update donation status (admin only).

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "status": "confirmed",
    ...
  }
}
```

---

#### `DELETE /api/donations?id=uuid`
Delete a donation (admin only).

**Response:**
```json
{
  "message": "Donation deleted successfully"
}
```

---

### Users Endpoints

#### `GET /api/users`
Get all users (admin only).

**Query Parameters:**
- `auth_user_id` (optional): Filter by auth user ID
- `email` (optional): Filter by email
- `wallet_address` (optional): Filter by wallet address
- `order` (optional): Sort order (e.g., `created_at.desc`)
- `limit` (optional): Limit number of results

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "auth_user_id": "uuid",
      "email": "user@example.com",
      "wallet_address": "0x...",
      "display_name": "John Doe",
      "total_donated": "1000000000000000000",
      "donation_count": 5,
      "first_donation_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "is_blocked": false
    }
  ]
}
```

---

#### `POST /api/users`
Create a new user record.

**Request Body:**
```json
{
  "auth_user_id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "wallet_address": "0x..."
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "auth_user_id": "uuid",
    ...
  }
}
```

---

#### `POST /api/users/upsert`
Upsert (insert or update) a user record.

**Request Body:**
```json
{
  "data": {
    "auth_user_id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe"
  },
  "onConflict": "auth_user_id"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "auth_user_id": "uuid",
    ...
  }
}
```

---

#### `PATCH /api/users?id=uuid`
Update a user record.

**Request Body:**
```json
{
  "wallet_address": "0x...",
  "total_donated": "2000000000000000000",
  "donation_count": 10,
  "is_blocked": false
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "wallet_address": "0x...",
    ...
  }
}
```

---

### Admins Endpoints

#### `GET /api/admins?username=admin`
Get admin by username (for login).

**Query Parameters:**
- `username` (required): Admin username

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "username": "pakchainadmin",
      "email": "admin@pakchainaid.com",
      "full_name": "PakChain Admin",
      "password_hash": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
      "is_active": true,
      "last_login": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `PATCH /api/admins?id=uuid`
Update admin (e.g., last_login).

**Request Body:**
```json
{
  "last_login": "2024-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "last_login": "2024-01-01T00:00:00Z",
    ...
  }
}
```

---

## Error Responses

All endpoints should return errors in this format:

```json
{
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Notes

1. **Amounts**: All ETH amounts are stored as strings representing wei (e.g., `"1000000000000000000"` for 1 ETH).

2. **UUIDs**: Use UUID v4 for all IDs.

3. **Timestamps**: Use ISO 8601 format (e.g., `"2024-01-01T00:00:00Z"`).

4. **CORS**: Ensure your backend allows requests from your frontend domain.

5. **Pagination**: For large result sets, consider implementing pagination with `limit` and `offset` parameters.

---

## Example Backend Implementation

See `backend/src/server.ts` for a complete Express.js implementation example.

