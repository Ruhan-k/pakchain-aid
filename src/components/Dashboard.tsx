import { useEffect, useState } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase, Donation, Campaign } from '../lib/supabase';
import { ethers } from 'ethers';
import { TrendingUp, Users, Zap, BarChart3 } from 'lucide-react';

type DonationWithCampaign = Donation & {
  campaigns?: {
    id: string;
    title: string;
  } | null;
};

interface DashboardStats {
  totalDonations: string;
  donationCount: number;
  uniqueDonors: number;
  recentDonations: Donation[];
  topCampaigns: (Campaign & { donation_count: number })[];
  userDonations?: DonationWithCampaign[];
  userTotalDonated?: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseAuthUser | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch all confirmed donations for stats
        const { data: allDonations, error: donError } = await supabase
          .from('donations')
          .select('*')
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false });

        if (donError) throw donError;

        // Fetch recent donations for display
        const { data: recentDonations } = await supabase
          .from('donations')
          .select('*')
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })
          .limit(10);

        // Fetch all campaigns
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('*')
          .eq('status', 'active');

        // Calculate donation counts per campaign
        const campaignDonationCounts = new Map<string, number>();
        allDonations?.forEach((donation) => {
          const count = campaignDonationCounts.get(donation.campaign_id) || 0;
          campaignDonationCounts.set(donation.campaign_id, count + 1);
        });

        // Create top campaigns with donation counts
        const topCampaigns = (campaigns || [])
          .map((campaign) => ({
            ...campaign,
            donation_count: campaignDonationCounts.get(campaign.id) || 0,
          }))
          .sort((a, b) => b.donation_count - a.donation_count)
          .slice(0, 5);

        // Calculate total donations across all donations
        const totalDonations = allDonations?.reduce(
          (sum, d) => sum + BigInt(d.amount || '0'),
          0n,
        ) || 0n;
        const uniqueDonors = new Set(allDonations?.map((d) => d.donor_wallet) || []).size;

        // Fetch user-specific donations if logged in
        let userDonations: DonationWithCampaign[] = [];
        let userTotalDonated = '0';
        if (user) {
          // Get user's wallet address from users table
          const { data: userData } = await supabase
            .from('users')
            .select('wallet_address')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (userData?.wallet_address) {
            const { data: userDons } = await supabase
              .from('donations')
              .select(`
                *,
                campaigns (
                  id,
                  title
                )
              `)
              .eq('donor_wallet', userData.wallet_address)
              .eq('status', 'confirmed')
              .order('created_at', { ascending: false });

            userDonations = (userDons || []) as DonationWithCampaign[];

            const userTotal = userDonations.reduce(
              (sum, d) => sum + BigInt(d.amount || '0'),
              0n,
            );
            userTotalDonated = ethers.formatEther(userTotal);
          }
        }

        setStats({
          totalDonations: ethers.formatEther(totalDonations),
          donationCount: allDonations?.length || 0,
          uniqueDonors,
          recentDonations: recentDonations || [],
          topCampaigns,
          userDonations,
          userTotalDonated,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Donations',
      value: `${stats?.totalDonations || '0'} ETH`,
      icon: Zap,
      color: 'from-blue-600 to-blue-700',
    },
    {
      label: 'Donations Count',
      value: stats?.donationCount || 0,
      icon: BarChart3,
      color: 'from-teal-600 to-teal-700',
    },
    {
      label: 'Unique Donors',
      value: stats?.uniqueDonors || 0,
      icon: Users,
      color: 'from-purple-600 to-purple-700',
    },
    {
      label: 'Active Campaigns',
      value: stats?.topCampaigns.length || 0,
      icon: TrendingUp,
      color: 'from-pink-600 to-pink-700',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Real-time blockchain donation analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 bg-gradient-to-br ${card.color} rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Donations */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="px-6 py-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Recent Donations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Donor
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Time
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Transaction
                </th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentDonations && stats.recentDonations.length > 0 ? (
                stats.recentDonations.map((donation) => (
                <tr
                  key={donation.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-900">
                      {donation.donor_wallet.slice(0, 6)}...{donation.donor_wallet.slice(-4)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {ethers.formatEther(donation.amount)} ETH
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {new Date(donation.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${donation.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold truncate inline-block max-w-xs"
                    >
                      {donation.transaction_hash.slice(0, 10)}...
                    </a>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No donations yet. Be the first to support a cause!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Donation History */}
      {user && stats?.userDonations && stats.userDonations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mt-8">
          <div className="px-6 py-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">Your Donation History</h2>
            <p className="text-sm text-gray-600 mt-1">
              Total donated: <span className="font-semibold text-blue-600">{stats.userTotalDonated} ETH</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Campaign
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.userDonations.map((donation) => (
                  <tr
                    key={donation.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {donation.campaigns?.title || `${donation.campaign_id.slice(0, 8)}...`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {ethers.formatEther(donation.amount)} ETH
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(donation.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${donation.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 font-semibold truncate inline-block max-w-xs"
                      >
                        {donation.transaction_hash.slice(0, 10)}...
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {user && (!stats?.userDonations || stats.userDonations.length === 0) && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mt-8 p-8 text-center">
          <p className="text-gray-600">You haven't made any donations yet. Start supporting causes today!</p>
        </div>
      )}
    </div>
  );
}
