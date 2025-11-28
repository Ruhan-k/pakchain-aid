# PakChain Aid - Transparent Blockchain Donation Platform

A production-quality Web3 donation platform built with React, TypeScript, Tailwind CSS, and Ethereum blockchain. Every donation is recorded permanently on the blockchain for complete transparency.

## Quick Start

### 1. Prerequisites

- **Node.js** v16+ ([Download](https://nodejs.org/))
- **MetaMask** browser extension ([Install](https://metamask.io/))
- ~5 minutes to set up

### 2. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173/
```

### 3. Connect Wallet & Donate

1. Click "Connect Wallet" button
2. Approve MetaMask connection
3. Switch to Sepolia testnet (automatic or manual)
4. Click on a campaign and donate
5. Confirm transaction in MetaMask
6. See donation recorded on blockchain

## Features

### 🎯 Campaign Management
- Browse active donation campaigns
- Real-time progress tracking
- Featured campaigns highlighted
- Blockchain-verified donation totals

### 💳 Wallet Integration
- MetaMask connection
- Automatic Sepolia testnet switching
- Balance display
- Transaction history

### 🫱 Transparent Donations
- Donate ETH with a single click
- View transaction on Etherscan
- All donations recorded on blockchain
- Immutable transaction records

### 📊 Analytics Dashboard
- Total ETH donated (platform-wide)
- Number of unique donors
- Recent transactions feed
- Real-time statistics

### 🤖 AI Assistant
- Floating chatbot in bottom-right
- Answer questions about donations
- Campaign information
- Donation statistics
- Natural language queries

### 🔒 Security & Privacy
- All data public by design
- No private keys stored
- Smart contract backed
- Row-level database security
- Non-custodial system

## Technology Stack

### Frontend
- **React 18** - User interface
- **TypeScript** - Type safety
- **Tailwind CSS** - Modern styling
- **Lucide React** - Icon library
- **Vite** - Build tool

### Backend/Data
- **Azure App Service** - REST API backend
- **Azure SQL Database** - PostgreSQL database
- **ethers.js** - Ethereum interaction
- **MetaMask** - Wallet connection

### Blockchain
- **Solidity** - Smart contract
- **Sepolia Testnet** - Development chain
- **Ethereum Mainnet** - Production ready

## Project Structure

```
src/
├── components/          # React components
│   ├── Navigation.tsx   # Top navigation bar
│   ├── Hero.tsx         # Landing page
│   ├── CampaignsList.tsx
│   ├── CampaignCard.tsx
│   ├── Dashboard.tsx    # Analytics
│   ├── DonationModal.tsx
│   └── Chatbot.tsx      # AI assistant
├── lib/
│   ├── api.ts           # Azure API client (Supabase-compatible interface)
│   ├── supabase.ts      # Compatibility layer (re-exports from api.ts)
│   └── web3.ts          # Ethereum functions
├── App.tsx              # Main application
├── main.tsx             # Entry point
└── index.css            # Global styles

PakChainAid.sol         # Smart contract (Solidity)
```

## Setup Guides

### Full Setup Guide
See **SETUP_GUIDE.md** for:
- Environment configuration
- MetaMask setup
- Getting testnet ETH
- Complete walkthrough

### Smart Contract Deployment
See **SMART_CONTRACT_GUIDE.md** for:
- Contract compilation
- Deployment to Sepolia
- Contract verification
- Integration with app

### Architecture & Design
See **ARCHITECTURE.md** for:
- System overview
- Data flow diagrams
- Database schema
- Technology decisions

### Troubleshooting
See **TROUBLESHOOTING.md** for solutions to:
- MetaMask issues
- Network problems
- Database errors
- Build failures
- + 10+ more common issues

## Environment Variables

```env
# Optional: For local development
VITE_API_URL=http://localhost:3000
```

**Note**: In production (Azure), the API URL is automatically detected. No environment variables needed!

## Build & Deploy

### Development Build
```bash
npm run dev
```
Starts local server at http://localhost:5173/ with hot reload.

### Production Build
```bash
npm run build
```
Creates optimized build in `dist/` folder, ready to deploy.

### Deploy to Production
```bash
# Build
npm run build

# Deploy to Vercel, Netlify, or any static host
# Copy contents of dist/ folder
# Configure to Ethereum Mainnet in App.tsx
```

## Key Components

### Navigation
- Responsive header with logo
- Wallet connection button
- Navigation links
- Mobile menu

### Hero Section
- Compelling headline
- Value proposition
- Call-to-action buttons
- Animated background

### Campaign Cards
- Campaign title & description
- Progress bar showing donations
- Donation count and status
- Donate button

### Donation Modal
- Amount input field
- Quick amount buttons (0.01, 0.05, 0.1, 0.5 ETH)
- Network fee display
- Confirm button with MetaMask integration

### Dashboard
- 4 stat cards (total donations, count, unique donors, active campaigns)
- Recent donations table
- Etherscan links
- Real-time updates

### Chatbot
- Floating bubble interface
- Persistent message history
- Quick responses
- Open/close toggle

## Smart Contract Functions

### For Administrators
```solidity
createCampaign(title, description, goalAmount)
closeCampaign(campaignId)
```

### For Users
```solidity
donate(campaignId) // payable - sends ETH
```

### Public Views (Free)
```solidity
getCampaign(campaignId)
getCampaignDonations(campaignId)
getCampaignTotal(campaignId)
getTotalDonations()
getDonorTotal(address)
getDonorHistory(address)
```

## Usage Examples

### Connect MetaMask
```typescript
import { connectWallet } from './lib/web3';

const address = await connectWallet();
console.log('Connected:', address);
```

### Make a Donation
```typescript
import { sendDonation } from './lib/web3';

const txHash = await sendDonation(
  contractAddress,
  campaignId,
  '0.1' // ETH amount
);
console.log('Transaction:', txHash);
```

### Query Database
```typescript
import { supabase } from './lib/supabase';

// Uses Azure backend API (Supabase-compatible interface)
const { data: campaigns } = await supabase
  .from('campaigns')
  .select('*')
  .eq('status', 'active');
```

## Testing

### Test Donations on Testnet

1. **Get Free ETH**
   ```
   Visit: https://www.alchemy.com/faucets/ethereum-sepolia
   Paste your wallet address
   Click "Send me ETH"
   Wait 30 seconds
   ```

2. **Make Test Donation**
   - Navigate to /campaigns
   - Click "Donate Now" on any campaign
   - Enter amount (e.g., 0.01 ETH)
   - Confirm in MetaMask
   - View on Etherscan

3. **Verify Transaction**
   - Success modal shows transaction hash
   - Click "View on Etherscan"
   - Verify transaction details

## Database Tables

### campaigns
Campaign records with goal/current amounts, status, and featured flag.

### donations
Individual donation records linked to campaigns, donor wallet, and transaction hash.

### users
Donor profiles tracking wallet address, total donated, donation count.

### analytics_cache
Aggregated statistics for dashboard (hourly, daily, weekly).

All tables have:
- Row-Level Security (RLS) enabled
- Proper foreign key constraints
- Indexed frequently-queried columns
- Automatic timestamp tracking

## Security

### Smart Contract
- Only owner can create campaigns
- Donations are permanent and irreversible
- No private data on-chain
- All transaction history immutable

### Database
- Azure SQL Database with proper authentication
- Public read access for campaigns/donations
- Authenticated write access via JWT tokens
- Environment variables stored securely in Azure

### Frontend
- No private keys stored
- All signing through MetaMask
- Environment variables for secrets
- CORS properly configured

## Network Information

### Sepolia Testnet
- **RPC URL**: https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161
- **Chain ID**: 11155111
- **Explorer**: https://sepolia.etherscan.io/
- **Free ETH**: https://www.alchemy.com/faucets/ethereum-sepolia

### Ethereum Mainnet
- **Chain ID**: 1
- **Explorer**: https://etherscan.io/
- **For production use only** (real ETH required)

## Common Issues

### MetaMask Not Detected
1. Install MetaMask from https://metamask.io/
2. Refresh page after installation
3. Check browser extensions if still not visible

### Wrong Network
1. Open MetaMask dropdown
2. Select "Sepolia"
3. Refresh page

### No Testnet ETH
1. Visit https://www.alchemy.com/faucets/ethereum-sepolia
2. Paste your wallet address
3. Click "Send me ETH"
4. Wait 30 seconds

### Build Fails
```bash
rm -rf node_modules dist
npm cache clean --force
npm install
npm run build
```

For more troubleshooting, see **TROUBLESHOOTING.md**.

## Documentation

- **SETUP_GUIDE.md** - Complete setup instructions
- **SMART_CONTRACT_GUIDE.md** - Deploy & test smart contract
- **ARCHITECTURE.md** - System design & data flow
- **TROUBLESHOOTING.md** - 14 common issues & solutions

## Contributing

To improve PakChain Aid:

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

Guidelines:
- Follow existing code style
- Maintain TypeScript types
- Update documentation
- Test on Sepolia testnet

## License

MIT License - Open source and free to use

## Roadmap

### Current (v1.0)
- Core donation platform
- MetaMask integration
- Campaign management
- Analytics dashboard
- AI chatbot

### Future
- Campaign NFT certificates
- Email notifications
- Payment splits (multiple recipients)
- Donation widgets for embedded use
- Multi-chain support (Polygon, Optimism)
- Advanced analytics
- Mobile app

## Support

### Get Help
1. Check TROUBLESHOOTING.md first
2. Review browser console (F12)
3. Check Azure App Service logs
4. Verify MetaMask connection

### Report Issues
1. Describe what went wrong
2. Share error messages
3. Include browser/OS info
4. Include steps to reproduce

## Contact

For questions or support:
- Check documentation files
- Review code comments
- Inspect browser console
- Test on Sepolia testnet

## Acknowledgments

Built with:
- React & TypeScript
- Tailwind CSS
- ethers.js
- Azure App Service & SQL Database
- Ethereum
- Lucide icons

---

**PakChain Aid v1.0**
*Transparent Blockchain Donations for Pakistan*

**Status**: Production Ready
**Network**: Sepolia Testnet (Dev), Ethereum Mainnet (Production)
**Last Updated**: November 2024
