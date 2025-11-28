import { useState } from 'react';
import { Campaign } from '../lib/supabase';
import { X, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';

interface DonationModalProps {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  onDonate: (amount: string) => Promise<string | null>;
}

export function DonationModal({
  campaign,
  isOpen,
  onClose,
  onDonate,
}: DonationModalProps) {
  const [amount, setAmount] = useState('0.1');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDonate = async () => {
    if (!campaign.receiving_wallet_address) {
      setError('This campaign does not have a receiving wallet address configured. Please contact the administrator.');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const tx = await onDonate(amount);
      if (tx) {
        setSuccess(tx);
        setAmount('0.1');
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Donation failed');
    } finally {
      setLoading(false);
    }
  };

  const goalEth = ethers.formatEther(campaign.goal_amount);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Make a Donation</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Campaign Info */}
          <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-4">
            <p className="text-sm text-gray-600">Supporting</p>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{campaign.title}</h3>
            <p className="text-sm text-gray-600 mt-2">Goal: {goalEth} ETH</p>
            {campaign.receiving_wallet_address && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Receiving Address:</p>
                <p className="text-xs font-mono text-blue-700 break-all">
                  {campaign.receiving_wallet_address}
                </p>
              </div>
            )}
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <CheckCircle className="w-16 h-16 text-green-500" />
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">Donation Successful!</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Thank you for supporting this cause.
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 break-all">
                <p className="text-xs text-gray-600 font-semibold mb-2">Transaction Hash:</p>
                <p className="text-xs font-mono text-blue-600">{success}</p>
              </div>
              <a
                href={`https://sepolia.etherscan.io/tx/${success}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-2 text-center bg-blue-50 text-blue-600 rounded-lg font-semibold hover:bg-blue-100 transition-colors text-sm"
              >
                View on Etherscan
              </a>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex gap-3 p-4 bg-red-50 rounded-lg items-start">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="w-full px-4 py-2 text-center bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Amount (ETH)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 font-semibold disabled:bg-gray-50"
                    placeholder="0.1"
                  />
                  <span className="absolute right-4 top-3 text-gray-600 font-semibold">
                    ETH
                  </span>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {['0.01', '0.05', '0.1', '0.5'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => setAmount(btn)}
                    disabled={loading}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                      amount === btn
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {btn}
                  </button>
                ))}
              </div>

              {/* Fee Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">You send:</span>
                  <span className="font-semibold text-gray-900">{amount} ETH</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Network fee:</span>
                  <span className="font-semibold text-gray-900">Varies</span>
                </div>
              </div>

              {/* Donate Button */}
              <button
                onClick={handleDonate}
                disabled={loading || !amount || parseFloat(amount) <= 0 || !campaign.receiving_wallet_address}
                className="w-full px-4 py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Donation'
                )}
              </button>

              {/* Disclaimer */}
              <p className="text-xs text-gray-600 text-center">
                By donating, you agree to the terms. All transactions are recorded on the
                blockchain.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
