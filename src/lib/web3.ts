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
