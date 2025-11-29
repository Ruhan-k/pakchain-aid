import { useEffect, useState } from 'react';
import { supabase, Campaign, Donation } from '../lib/supabase';
import { ethers } from 'ethers';
import { X, Loader, Filter } from 'lucide-react';

type SortOption = 'latest' | 'oldest' | 'largest' | 'smallest' | 'confirmed' | 'pending';

interface CampaignDetailsProps {
  campaign: Campaign;
  onClose: () => void;
}

export function CampaignDetails({ campaign, onClose }: CampaignDetailsProps) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('latest');

  useEffect(() => {
    fetchDonations();
    const subscription = supabase
      .channel(`donations_${campaign.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations', filter: `campaign_id=eq.${campaign.id}` },
        () => fetchDonations(),
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id, sort]);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      let query = supabase.from('donations').select('*').eq('campaign_id', campaign.id);

      switch (sort) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'largest':
          query = query.order('amount', { ascending: false });
          break;
        case 'smallest':
          query = query.order('amount', { ascending: true });
          break;
        case 'confirmed':
          query = query.eq('status', 'confirmed').order('created_at', { ascending: false });
          break;
        case 'pending':
          query = query.eq('status', 'pending').order('created_at', { ascending: false });
          break;
        case 'latest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      setDonations(data || []);
    } catch (err) {
      console.error('Error fetching donations:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string) => {
    try {
      return `${Number(ethers.formatEther(amount)).toFixed(4)} ETH`;
    } catch {
      return `${amount} wei`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm uppercase tracking-wide text-blue-600 font-semibold">Campaign Details</p>
            <h2 className="text-2xl font-bold text-gray-900">{campaign.title}</h2>
            <p className="text-sm text-gray-500 mt-1">Transaction history is publicly visible for transparency.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Description</p>
            <p className="text-gray-900">{campaign.description || 'No description provided.'}</p>
          </div>
          <div>
            <p className="text-gray-500">Goal Amount</p>
            <p className="text-gray-900 font-semibold">{formatAmount(campaign.goal_amount)}</p>
          </div>
          <div>
            <p className="text-gray-500">Current Amount</p>
            <p className="text-gray-900 font-semibold">{formatAmount(campaign.current_amount)}</p>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Sort transactions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              ['latest', 'oldest', 'largest', 'smallest', 'confirmed', 'pending'] as SortOption[]
            ).map((option) => (
              <button
                key={option}
                onClick={() => setSort(option)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  sort === option
                    ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Donations table with scrollable area for long histories */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              Loading transactions...
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No transactions found for this campaign.
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-80 md:max-h-[50vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Donor Wallet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {donations.map((donation) => (
                    <tr key={donation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-mono text-gray-900">
                        {donation.donor_wallet.slice(0, 6)}...{donation.donor_wallet.slice(-4)}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">{formatAmount(donation.amount)}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            donation.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : donation.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {new Date(donation.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <a
                          href={`https://sepolia.etherscan.io/tx/${donation.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

