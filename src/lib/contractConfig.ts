/**
 * Smart Contract Configuration
 * 
 * After deploying the smart contract, update CONTRACT_ADDRESS with your deployed contract address.
 * 
 * To deploy:
 * 1. Compile the contract using Hardhat, Remix, or another Solidity compiler
 * 2. Deploy to Sepolia testnet (or mainnet for production)
 * 3. Copy the deployed contract address
 * 4. Update CONTRACT_ADDRESS below
 * 5. Verify the contract on Etherscan (optional but recommended)
 */

// Sepolia Testnet Contract Address
// Replace this with your deployed contract address
export const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS || '0x51e747a14d32caa752ceac5c04627c1fc99ff142';

// Contract deployment network
export const CONTRACT_NETWORK = {
  chainId: 11155111, // Sepolia Testnet
  name: 'Sepolia',
  explorer: 'https://sepolia.etherscan.io',
};

// Mainnet configuration (for production)
export const MAINNET_CONFIG = {
  chainId: 1,
  name: 'Ethereum Mainnet',
  explorer: 'https://etherscan.io',
};

/**
 * Check if contract address is configured
 */
export const isContractConfigured = (): boolean => {
  return CONTRACT_ADDRESS !== '' && CONTRACT_ADDRESS.length === 42 && CONTRACT_ADDRESS.startsWith('0x');
};

/**
 * Get contract address with validation
 */
export const getContractAddress = (): string => {
  if (!isContractConfigured()) {
    throw new Error('Smart contract address is not configured. Please set VITE_CONTRACT_ADDRESS environment variable or update contractConfig.ts');
  }
  return CONTRACT_ADDRESS;
};


