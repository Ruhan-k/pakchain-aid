import { ethers } from 'ethers';

interface EthereumProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export const getProvider = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }
  return new ethers.BrowserProvider(window.ethereum);
};

export const getSigner = async () => {
  const provider = await getProvider();
  return provider.getSigner();
};

export const connectWallet = async () => {
  const provider = await getProvider();
  const accounts = await provider.send('eth_requestAccounts', []);
  return accounts[0];
};

export const getBalance = async (address: string) => {
  const provider = await getProvider();
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
};

export const getCurrentNetwork = async () => {
  const provider = await getProvider();
  const network = await provider.getNetwork();
  return {
    chainId: network.chainId,
    name: network.name,
  };
};

export const switchToSepolia = async () => {
  if (!window.ethereum) throw new Error('MetaMask not installed');

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }], // Sepolia chainId
    });
  } catch (error: unknown) {
    const errorWithCode = error as { code?: number };
    if (errorWithCode.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xaa36a7',
          chainName: 'Sepolia Testnet',
          rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
          nativeCurrency: { name: 'Sepolia ETH', symbol: 'SEP', decimals: 18 },
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }],
      });
      return;
    }
    throw errorWithCode;
  }
};

// Complete ABI for PakChainAid smart contract
export const PAKCHAIN_AID_CONTRACT_ABI = [
  // Campaign Management
  'function createCampaign(string memory _title, string memory _description, address _recipientAddress, uint256 _goalAmount, bool _isFeatured) external returns (uint256)',
  'function updateCampaign(uint256 _campaignId, string memory _title, string memory _description, bool _isActive, bool _isFeatured) external',
  'function closeCampaign(uint256 _campaignId) external',
  
  // Donation Functions
  'function donate(uint256 _campaignId) payable',
  
  // View Functions
  'function getCampaign(uint256 _campaignId) view returns (tuple(uint256 id, string title, string description, address recipientAddress, uint256 goalAmount, uint256 currentAmount, uint256 donationCount, bool isActive, bool isFeatured, uint256 createdAt, uint256 updatedAt))',
  'function getCampaignDonations(uint256 _campaignId) view returns (tuple(uint256 campaignId, address donor, uint256 amount, uint256 timestamp, bool exists)[])',
  'function getCampaignTotal(uint256 _campaignId) view returns (uint256)',
  'function getTotalDonations() view returns (uint256)',
  'function getDonorTotal(address _donor) view returns (uint256)',
  'function getDonorCount(address _donor) view returns (uint256)',
  'function getDonorHistory(address _donor) view returns (uint256[])',
  'function getActiveCampaignCount() view returns (uint256)',
  'function getTotalCampaignCount() view returns (uint256)',
  'function campaigns(uint256) view returns (uint256 id, string title, string description, address recipientAddress, uint256 goalAmount, uint256 currentAmount, uint256 donationCount, bool isActive, bool isFeatured, uint256 createdAt, uint256 updatedAt)',
  
  // Admin Functions
  'function setPlatformFee(address _platformFeeAddress, uint256 _platformFeePercentage) external',
  'function pause() external',
  'function unpause() external',
  'function transferOwnership(address _newOwner) external',
  
  // State Variables
  'function owner() view returns (address)',
  'function platformFeeAddress() view returns (address)',
  'function platformFeePercentage() view returns (uint256)',
  'function paused() view returns (bool)',
  
  // Events
  'event CampaignCreated(uint256 indexed campaignId, string title, address indexed recipientAddress, uint256 goalAmount, address indexed creator)',
  'event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 platformFee, uint256 netAmount, uint256 timestamp)',
  'event CampaignUpdated(uint256 indexed campaignId, string title, bool isActive, bool isFeatured)',
  'event CampaignClosed(uint256 indexed campaignId, uint256 totalRaised, uint256 donationCount)',
];

// Legacy ABI (kept for backward compatibility)
export const DONATION_CONTRACT_ABI = [
  'function donate(uint256 campaignId) payable',
  'function getCampaignDonations(uint256 campaignId) view returns (uint256)',
  'function getTotalDonations() view returns (uint256)',
  'event DonationReceived(indexed uint256 campaignId, indexed address donor, uint256 amount)',
];

// Direct wallet-to-wallet transfer (replaces contract-based donation)
export const sendDonationDirect = async (
  toAddress: string,
  amountInEth: string,
) => {
  if (!ethers.isAddress(toAddress)) {
    throw new Error('Invalid receiving wallet address');
  }

  const signer = await getSigner();
  const tx = await signer.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amountInEth),
  });

  return tx.hash;
};

// Send donation with platform fee split
export const sendDonationWithFee = async (
  campaignAddress: string,
  platformFeeAddress: string | null,
  donationAmountInEth: string,
  platformFeeAmountInEth: string,
) => {
  if (!ethers.isAddress(campaignAddress)) {
    throw new Error('Invalid campaign wallet address');
  }

  const signer = await getSigner();
  const donationAmountWei = ethers.parseEther(donationAmountInEth);
  
  // If platform fee is enabled, send two transactions
  if (platformFeeAddress && platformFeeAmountInEth && parseFloat(platformFeeAmountInEth) > 0) {
    if (!ethers.isAddress(platformFeeAddress)) {
      throw new Error('Invalid platform fee wallet address');
    }

    const platformFeeWei = ethers.parseEther(platformFeeAmountInEth);
    const totalAmountWei = donationAmountWei + platformFeeWei;

    // Send platform fee first
    const feeTx = await signer.sendTransaction({
      to: platformFeeAddress,
      value: platformFeeWei,
    });
    await feeTx.wait(); // Wait for fee transaction to complete

    // Then send donation
    const donationTx = await signer.sendTransaction({
      to: campaignAddress,
      value: donationAmountWei,
    });

    // Return the donation transaction hash (main transaction)
    return donationTx.hash;
  } else {
    // No platform fee, just send donation
    const tx = await signer.sendTransaction({
      to: campaignAddress,
      value: donationAmountWei,
    });

    return tx.hash;
  }
};

// Legacy contract-based donation (kept for backward compatibility)
export const sendDonation = async (
  contractAddress: string,
  campaignId: string,
  amountInEth: string,
) => {
  const signer = await getSigner();
  const contract = new ethers.Contract(contractAddress, DONATION_CONTRACT_ABI, signer);

  const tx = await contract.donate(campaignId, {
    value: ethers.parseEther(amountInEth),
  });

  return tx.hash;
};

// Verify transaction on-chain
export const verifyTransaction = async (
  txHash: string,
  expectedTo: string,
  expectedAmount: string,
): Promise<{ verified: boolean; blockNumber?: number; timestamp?: number }> => {
  try {
    const provider = await getProvider();
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      return { verified: false };
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      return { verified: false };
    }

    // Verify recipient address
    if (tx.to?.toLowerCase() !== expectedTo.toLowerCase()) {
      return { verified: false };
    }

    // Verify amount (with small tolerance for gas)
    const expectedAmountWei = BigInt(expectedAmount);
    const actualAmount = tx.value;
    // Allow 1% tolerance
    const tolerance = expectedAmountWei / 100n;
    if (actualAmount < expectedAmountWei - tolerance || actualAmount > expectedAmountWei + tolerance) {
      return { verified: false };
    }

    // Get block for timestamp
    const block = await provider.getBlock(receipt.blockNumber);
    
    return {
      verified: true,
      blockNumber: receipt.blockNumber,
      timestamp: block?.timestamp,
    };
  } catch (error) {
    console.error('Transaction verification error:', error);
    return { verified: false };
  }
};

export const getEtherscanUrl = (txHash: string, chainId: number = 11155111) => {
  const baseUrl = chainId === 11155111 ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';
  return `${baseUrl}/tx/${txHash}`;
};

// ============ Smart Contract Interaction Functions ============

/**
 * Get the PakChainAid contract instance
 * @param contractAddress The deployed contract address
 * @returns Contract instance
 */
export const getPakChainAidContract = async (contractAddress: string) => {
  const signer = await getSigner();
  return new ethers.Contract(contractAddress, PAKCHAIN_AID_CONTRACT_ABI, signer);
};

/**
 * Get the PakChainAid contract instance (read-only)
 * @param contractAddress The deployed contract address
 * @returns Contract instance (read-only)
 */
export const getPakChainAidContractReadOnly = async (contractAddress: string) => {
  const provider = await getProvider();
  return new ethers.Contract(contractAddress, PAKCHAIN_AID_CONTRACT_ABI, provider);
};

/**
 * Donate to a campaign using the smart contract
 * @param contractAddress The deployed contract address
 * @param campaignId Campaign ID (on-chain)
 * @param amountInEth Amount to donate in ETH
 * @returns Transaction hash
 */
export const donateViaContract = async (
  contractAddress: string,
  campaignId: number,
  amountInEth: string,
): Promise<string> => {
  const contract = await getPakChainAidContract(contractAddress);
  const tx = await contract.donate(campaignId, {
    value: ethers.parseEther(amountInEth),
  });
  return tx.hash;
};

/**
 * Get campaign details from smart contract
 * @param contractAddress The deployed contract address
 * @param campaignId Campaign ID
 * @returns Campaign details
 */
export const getCampaignFromContract = async (
  contractAddress: string,
  campaignId: number,
) => {
  const contract = await getPakChainAidContractReadOnly(contractAddress);
  return await contract.getCampaign(campaignId);
};

/**
 * Get total donations for a campaign from smart contract
 * @param contractAddress The deployed contract address
 * @param campaignId Campaign ID
 * @returns Total amount in wei
 */
export const getCampaignTotalFromContract = async (
  contractAddress: string,
  campaignId: number,
): Promise<bigint> => {
  const contract = await getPakChainAidContractReadOnly(contractAddress);
  return await contract.getCampaignTotal(campaignId);
};

/**
 * Get all donations for a campaign from smart contract
 * @param contractAddress The deployed contract address
 * @param campaignId Campaign ID
 * @returns Array of donations
 */
export const getCampaignDonationsFromContract = async (
  contractAddress: string,
  campaignId: number,
) => {
  const contract = await getPakChainAidContractReadOnly(contractAddress);
  return await contract.getCampaignDonations(campaignId);
};

/**
 * Get total donations across all campaigns from smart contract
 * @param contractAddress The deployed contract address
 * @returns Total amount in wei
 */
export const getTotalDonationsFromContract = async (
  contractAddress: string,
): Promise<bigint> => {
  const contract = await getPakChainAidContractReadOnly(contractAddress);
  return await contract.getTotalDonations();
};

/**
 * Get donor statistics from smart contract
 * @param contractAddress The deployed contract address
 * @param donorAddress Donor wallet address
 * @returns Object with total donated and donation count
 */
export const getDonorStatsFromContract = async (
  contractAddress: string,
  donorAddress: string,
) => {
  const contract = await getPakChainAidContractReadOnly(contractAddress);
  const [total, count, history] = await Promise.all([
    contract.getDonorTotal(donorAddress),
    contract.getDonorCount(donorAddress),
    contract.getDonorHistory(donorAddress),
  ]);
  return {
    total: total.toString(),
    count: count.toString(),
    history: history.map((id: bigint) => Number(id)),
  };
};
