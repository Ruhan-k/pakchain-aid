# PakChain Aid Smart Contract Deployment Guide

## What is a Smart Contract?

A smart contract is code running on the blockchain that automatically executes when conditions are met. PakChain Aid uses a smart contract to:

- Record donations permanently
- Track campaigns
- Store donation data
- Prevent fraud through immutability

## Quick Deploy (5 minutes)

### Step 1: Open Remix IDE

1. Go to https://remix.ethereum.org/ (no installation needed)
2. Bookmark this page for future use

### Step 2: Create New File

1. Left panel shows "File Explorer"
2. Click folder icon with "+" sign
3. Name it: `PakChainAid.sol`
4. Click OK

### Step 3: Copy Smart Contract Code

1. Open `PakChainAid.sol` file from project root
2. Copy entire contents (Ctrl+A, Ctrl+C)
3. In Remix, paste into the new file (Ctrl+V)

### Step 4: Compile Contract

1. Left panel: Click "Solidity Compiler" icon (looks like radio button)
2. Click blue "Compile PakChainAid.sol" button
3. Wait for compilation (should show green checkmark)

**Expected output:**
```
✓ PakChainAid.sol compiled successfully
```

### Step 5: Deploy to Sepolia

1. Left panel: Click "Deploy & Run Transactions" icon
2. Select network dropdown
3. Choose "Injected Provider - MetaMask"
4. MetaMask popup appears - click "Connect" and approve
5. Make sure MetaMask shows "Sepolia" network
6. Click orange "Deploy" button
7. MetaMask shows transaction - click "Confirm"
8. Wait for confirmation (usually 10-30 seconds)

### Step 6: Get Contract Address

After deployment, you'll see in Remix console:

```
Deployed at: 0x1234567890abcdef1234567890abcdef12345678
```

**Copy this address!** You'll need it in the app.

## Verify Deployment

### Check on Etherscan

1. Copy your contract address from Remix
2. Go to https://sepolia.etherscan.io/
3. Paste address in search box
4. You should see your contract details
5. Look for your transactions

### Verify in MetaMask

1. Open MetaMask
2. Click "Activity" tab
3. Look for deployment transaction
4. Click to see details

## Update App with Contract Address

### Edit App.tsx

1. Open `src/App.tsx` in code editor
2. Find line:
   ```typescript
   const DONATION_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';
   ```
3. Replace with your deployed address:
   ```typescript
   const DONATION_CONTRACT_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
   ```
4. Save file (Ctrl+S)
5. Refresh browser

## Test Contract Functions

### In Remix Console

After deployment, expand your contract in Remix:

1. Click arrow next to contract name in Remix
2. You see available functions
3. Test "createCampaign":
   - Title: "Education Fund"
   - Description: "Supporting local schools"
   - Goal: 10 (in Ether)
   - Click "transact"
   - MetaMask confirms

### Verify Campaign Created

```javascript
// In Remix console, test getCampaign function
getCampaign(0)
// Returns campaign details
```

## Understanding the Contract

### Key Functions

| Function | Purpose | Cost |
|----------|---------|------|
| `createCampaign()` | Admin creates campaign | Gas fee |
| `donate()` | User donates to campaign | Gas + amount |
| `getCampaign()` | View campaign details | Free (read-only) |
| `getCampaignDonations()` | View all donations for campaign | Free (read-only) |
| `getTotalDonations()` | Get total platform donations | Free (read-only) |

### Contract Security Features

1. **Only owner can create campaigns** - Prevents spam
2. **Donations are permanent** - Can't reverse (immutable)
3. **All data public** - Transparency by default
4. **No private data** - Only wallet addresses shown
5. **Event logging** - All actions recorded

## Gas Fees Explained

"Gas" is the cost to execute transactions on blockchain:

- Creating campaign: ~100,000 gas
- Donating: ~50,000 gas
- Reading data: 0 gas (free)

**On Sepolia testnet:** Free! (Uses test ETH)
**On Mainnet (real ETH):** Costs vary based on network congestion

## Common Issues

### Contract Won't Deploy

**Error:** "Compilation failed"

**Fix:**
- Check Solidity version in Remix matches (0.8.0 or higher)
- Look for red "X" in compiler - click it to see error
- Common issue: typo in code
- Copy fresh from `PakChainAid.sol` file

### MetaMask Won't Connect to Remix

**Error:** "Provider not found"

**Fix:**
- Install MetaMask first
- Refresh Remix page
- Click "Connect" in MetaMask popup
- Check if on Sepolia testnet
- Try different browser

### Wrong Network Selected

**Error:** "You are on the wrong network"

**Fix:**
- Open MetaMask
- Click network dropdown
- Select "Sepolia"
- Refresh Remix
- Try deploying again

### Insufficient Gas

**Error:** "Insufficient balance for gas"

**Fix:**
- Get free Sepolia ETH: https://www.alchemy.com/faucets/ethereum-sepolia
- Wait 30 seconds for confirmation
- Check MetaMask balance shows ETH
- Try deployment again

## Advanced: Deploy Locally with Hardhat

For developers who want more control:

```bash
# Install Hardhat
npm install --save-dev hardhat

# Initialize Hardhat project
npx hardhat

# Copy PakChainAid.sol to contracts/

# Configure hardhat.config.js for Sepolia
# [Setup not shown here - see Hardhat docs]

# Deploy
npx hardhat run scripts/deploy.js --network sepolia
```

## After Deployment

### Next Steps

1. ✓ Copy contract address
2. ✓ Update in App.tsx
3. ✓ Test donation flow
4. ✓ Verify on Etherscan
5. → Create test campaigns
6. → Make test donations
7. → Check analytics dashboard

### Monitor Contract

Monitor your contract on Etherscan:
- Recent transactions
- Donation events
- Fund total
- Donor count

## Upgrade to Mainnet (Production)

When ready for real donations:

1. Deploy same contract to Mainnet (not Sepolia)
2. Update contract address in production app
3. Users will need real ETH (not test ETH)
4. All functions work the same

**Warning:** Cannot change or delete contract once deployed. Design carefully!

## Smart Contract FAQ

**Q: Can I change the contract after deployment?**
A: No, blockchain is immutable. Must deploy new version if changes needed.

**Q: Can I take back donations?**
A: No, smart contract prevents refunds. Blockchain is permanent.

**Q: How many people can donate?**
A: Unlimited. No contract limit.

**Q: What happens if someone sends ETH directly?**
A: Contract rejects it with "Use donate function" message.

**Q: Can anyone be owner?**
A: No, only original deployer (you). Stored in contract.

**Q: How long will contract run?**
A: Forever, as long as blockchain exists. Blockchain never goes down.

## Contract Events

The contract emits events that the app listens to:

```solidity
DonationReceived(campaignId, donor, amount, timestamp)
CampaignCreated(campaignId, title, goalAmount)
CampaignClosed(campaignId)
```

These events sync data between blockchain and Azure SQL Database.

## Security Checklist

Before deploying to Mainnet:

- [ ] Contract tested on Sepolia testnet
- [ ] All donations recorded correctly
- [ ] Donations cannot be reversed
- [ ] Only owner can create campaigns
- [ ] Events emit correctly
- [ ] No private data in contract
- [ ] All functions tested

---

**Last Updated:** November 2024
**Solidity Version:** 0.8.0+
**Network:** Sepolia Testnet (for testing) / Ethereum Mainnet (production)
