# Platform Fee Feature Implementation

## Overview

The platform fee feature allows administrators to collect a fee on each donation. When enabled, the fee is automatically added to the total amount the user pays, and the payment is split between the campaign and the platform.

## How It Works

### For Administrators

1. **Create Campaign with Platform Fee:**
   - When creating a campaign, you can optionally set:
     - **Platform Fee Address**: Ethereum address to receive platform fees
     - **Platform Fee Amount**: Fee amount in ETH per transaction
   - If Platform Fee Address is left empty, no fee is collected

2. **Edit Campaign:**
   - You can add, modify, or remove platform fee settings when editing a campaign
   - Setting Platform Fee Address to empty disables fee collection

### For Users

1. **Making a Donation:**
   - User enters donation amount (e.g., 0.1 ETH)
   - If platform fee is enabled, it's automatically added:
     - Donation: 0.1 ETH
     - Platform Fee: 0.001 ETH (example)
     - **Total Pay: 0.101 ETH**
   - User sees the breakdown before confirming

2. **Transaction Flow:**
   - Two transactions are sent (if fee enabled):
     1. Platform fee transaction → Platform address
     2. Donation transaction → Campaign address
   - Both transactions must succeed for the donation to be recorded

## Database Changes

### New Columns in `campaigns` Table

- `platform_fee_address` (NVARCHAR(255), NULL)
  - Ethereum address to receive platform fees
  - If NULL, no platform fee is collected
  
- `platform_fee_amount` (NVARCHAR(255), NULL)
  - Platform fee amount in wei (stored as string for large numbers)
  - If NULL or platform_fee_address is NULL, no fee is collected

### Migration Script

Run `backend/sql/add_platform_fee_to_campaigns.sql` in Azure SQL Database Query Editor.

## Code Changes

### Frontend

1. **Campaign Type** (`src/lib/api.ts`)
   - Added `platform_fee_address` and `platform_fee_amount` fields

2. **Admin Dashboard** (`src/components/AdminDashboard.tsx`)
   - Added platform fee fields to create/edit campaign forms
   - Validation for fee address and amount

3. **Donation Modal** (`src/components/DonationModal.tsx`)
   - Shows platform fee breakdown
   - Displays total amount user will pay
   - Clear fee information

4. **Donation Flow** (`src/App.tsx`)
   - Updated to use `sendDonationWithFee` when platform fee is enabled
   - Handles split payment transactions

5. **Web3 Library** (`src/lib/web3.ts`)
   - New function: `sendDonationWithFee()`
   - Sends two transactions: fee first, then donation
   - Returns donation transaction hash

### Backend

1. **Campaigns Route** (`backend/src/routes/campaigns.ts`)
   - Updated POST endpoint to accept platform fee fields
   - Updated PATCH endpoint to allow updating platform fee fields

## Setup Instructions

### Step 1: Run Database Migration

1. Go to Azure Portal → Your SQL Database
2. Click **Query editor**
3. Open `backend/sql/add_platform_fee_to_campaigns.sql`
4. Copy and paste into Query Editor
5. Click **Run**
6. You should see: "Platform fee columns added successfully!"

### Step 2: Deploy Code Changes

The code changes are ready. Commit and push:

```bash
git add .
git commit -m "Add platform fee feature to campaigns"
git push origin main
```

### Step 3: Test the Feature

1. **As Admin:**
   - Create a new campaign
   - Set Platform Fee Address (optional)
   - Set Platform Fee Amount (if address is set)
   - Save campaign

2. **As User:**
   - Go to campaigns page
   - Click "Donate" on a campaign with platform fee
   - See the fee breakdown in the modal
   - Confirm donation
   - Two transactions will be sent (fee + donation)

## Example Usage

### Campaign with Platform Fee

**Settings:**
- Platform Fee Address: `0x1234...5678`
- Platform Fee Amount: `0.001` ETH

**User Donation:**
- User enters: `0.1` ETH
- Platform fee: `0.001` ETH
- **Total user pays: 0.101 ETH**
- Campaign receives: `0.1` ETH
- Platform receives: `0.001` ETH

### Campaign without Platform Fee

**Settings:**
- Platform Fee Address: (empty)
- Platform Fee Amount: (empty)

**User Donation:**
- User enters: `0.1` ETH
- Platform fee: None
- **Total user pays: 0.1 ETH**
- Campaign receives: `0.1` ETH

## Important Notes

1. **Fee Amount**: Stored in wei (smallest unit of ETH) in database
2. **Validation**: Platform fee address must be valid Ethereum address if provided
3. **Fee Amount**: Must be greater than 0 if platform fee address is set
4. **Transactions**: Two separate transactions are sent (fee first, then donation)
5. **Verification**: Only the donation transaction is verified (fee is separate)

## Troubleshooting

### Platform fee not showing in donation modal?
- Check that campaign has `platform_fee_address` and `platform_fee_amount` set
- Verify the values in database

### Fee transaction fails?
- User will see error message
- Donation transaction won't be sent if fee transaction fails
- User can retry

### Want to disable platform fee?
- Edit campaign
- Clear Platform Fee Address field
- Save campaign

---

**Status**: ✅ Implementation Complete
**Next**: Run database migration and deploy code

