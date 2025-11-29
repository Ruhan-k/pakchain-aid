import { useState, useEffect, useCallback } from 'react';
import { supabase, Campaign, Donation, User } from '../lib/supabase';
import { Admin } from '../lib/adminAuth';
import { withRetry } from '../lib/retry';
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Users, 
  TrendingUp,
  DollarSign,
  LogOut,
  Save,
  X
} from 'lucide-react';
import { ethers } from 'ethers';

interface AdminDashboardProps {
  admin: Admin;
  onLogout: () => void;
}

type Tab = 'campaigns' | 'donations' | 'users' | 'analytics';

type CampaignFormState = {
  title: string;
  description: string;
  goal_amount: string;
  image_url: string;
  status: 'active' | 'inactive' | 'completed';
  is_featured: boolean;
  receiving_wallet_address: string;
  platform_fee_address: string;
  platform_fee_amount: string;
};

type DonationWithCampaign = Donation & {
  campaigns?: {
    id: string;
    title: string;
  } | null;
};

export function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<DonationWithCampaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState<CampaignFormState>({
    title: '',
    description: '',
    goal_amount: '',
    image_url: '',
    status: 'active',
    is_featured: false,
    receiving_wallet_address: '',
    platform_fee_address: '',
    platform_fee_amount: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'campaigns': {
          const { data: campaignsData, error: campaignsError } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });
          if (campaignsError) {
            console.error('Error fetching campaigns:', campaignsError);
          }
          setCampaigns(campaignsData || []);
          break;
        }
        case 'donations': {
          const { data: donationsData, error: donationsError } = await supabase
            .from('donations')
            .select(`
              *,
              campaigns (
                id,
                title
              )
            `)
            .order('created_at', { ascending: false })
            .limit(100);
          if (donationsError) {
            console.error('Error fetching donations:', donationsError);
          }
          setDonations((donationsData || []) as DonationWithCampaign[]);
          break;
        }
        case 'users': {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
          if (usersError) {
            console.error('Error fetching users:', usersError);
            console.error('Users error details:', usersError.message, usersError.code);
          } else {
            console.log('Users fetched successfully:', usersData?.length || 0, 'users');
          }
          setUsers(usersData || []);
          break;
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const refreshData = useCallback(async () => {
    try {
      await withRetry(fetchData, 2, 1000);
    } catch (error) {
      console.error('Error fetching data after retries:', error);
    }
  }, [fetchData]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const handleCreateCampaign = async () => {
    try {
      // Validate required fields
      if (!newCampaign.title || newCampaign.title.trim() === '') {
        alert('Please enter a campaign title');
        return;
      }

      if (!newCampaign.goal_amount || parseFloat(newCampaign.goal_amount) <= 0) {
        alert('Please enter a valid goal amount greater than 0');
        return;
      }

      if (!newCampaign.receiving_wallet_address || !ethers.isAddress(newCampaign.receiving_wallet_address)) {
        alert('Please enter a valid Ethereum wallet address for receiving donations');
        return;
      }

      // Validate platform fee address if provided
      if (newCampaign.platform_fee_address && !ethers.isAddress(newCampaign.platform_fee_address)) {
        alert('Please enter a valid Ethereum wallet address for platform fee collection');
        return;
      }

      // Validate platform fee amount if address is provided
      if (newCampaign.platform_fee_address && (!newCampaign.platform_fee_amount || parseFloat(newCampaign.platform_fee_amount) <= 0)) {
        alert('Please enter a valid platform fee amount (greater than 0) when platform fee address is set');
        return;
      }

      const goalInWei = ethers.parseEther(newCampaign.goal_amount).toString();
      const platformFeeInWei = newCampaign.platform_fee_amount 
        ? ethers.parseEther(newCampaign.platform_fee_amount).toString()
        : null;

      const campaignData = {
        title: newCampaign.title.trim(),
        description: newCampaign.description.trim() || null,
        goal_amount: goalInWei,
        current_amount: '0',
        image_url: newCampaign.image_url.trim() || null,
        status: newCampaign.status,
        is_featured: newCampaign.is_featured,
        receiving_wallet_address: newCampaign.receiving_wallet_address.trim(),
        platform_fee_address: newCampaign.platform_fee_address.trim() || null,
        platform_fee_amount: platformFeeInWei,
        // created_by can be null since admin doesn't use Supabase Auth
      };

      console.log('📤 Creating campaign with data:', campaignData);
      console.log('🔗 API Base URL:', window.location.origin);

      const { data, error } = await supabase.from('campaigns').insert(campaignData).select();

      console.log('📥 Campaign creation response:', { data, error });

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        alert(`Failed to create campaign: ${error.message || 'Unknown error'}\n\nError code: ${error.code || 'N/A'}\n\nCheck browser console (F12) for details.`);
        return;
      }

      // Handle nested data structure: data might be { data: [...] } or [...]
      let campaignsArray = data;
      if (data && typeof data === 'object' && !Array.isArray(data) && data.data) {
        campaignsArray = Array.isArray(data.data) ? data.data : [data.data];
        console.log('🔧 Extracted campaigns array from nested structure:', campaignsArray);
      }

      if (campaignsArray && Array.isArray(campaignsArray) && campaignsArray.length > 0) {
        console.log('✅ Campaign created successfully:', campaignsArray[0]);
        setShowCreateModal(false);
        setNewCampaign({
          title: '',
          description: '',
          goal_amount: '',
          image_url: '',
          status: 'active',
          is_featured: false,
          receiving_wallet_address: '',
          platform_fee_address: '',
          platform_fee_amount: '',
        });
        await refreshData();
        alert('Campaign created successfully!');
      } else {
        console.warn('⚠️ Campaign creation returned no data:', { data, campaignsArray });
        console.warn('⚠️ Data type:', typeof data, 'Is array:', Array.isArray(data));
        alert('Campaign creation completed but no data returned. Please refresh and check if the campaign was created.');
        await refreshData();
      }
    } catch (error) {
      console.error('❌ Exception creating campaign:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create campaign: ${errorMessage}\n\nCheck browser console (F12) for details.`);
    }
  };

  const handleUpdateCampaign = async () => {
    if (!editingCampaign) return;
    try {
      if (!editingCampaign.receiving_wallet_address || !ethers.isAddress(editingCampaign.receiving_wallet_address)) {
        alert('Please enter a valid Ethereum wallet address for receiving donations');
        return;
      }

      // Validate platform fee if provided
      if (editingCampaign.platform_fee_address && !ethers.isAddress(editingCampaign.platform_fee_address)) {
        alert('Please enter a valid Ethereum wallet address for platform fee collection');
        return;
      }

      const updates: Partial<Campaign> & { updated_at: string } = {
        title: editingCampaign.title,
        description: editingCampaign.description,
        status: editingCampaign.status,
        is_featured: editingCampaign.is_featured,
        receiving_wallet_address: editingCampaign.receiving_wallet_address.trim(),
        platform_fee_address: editingCampaign.platform_fee_address?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Handle platform fee amount
      if (editingCampaign.platform_fee_address && editingCampaign.platform_fee_amount) {
        if (editingCampaign.platform_fee_amount.includes('.')) {
          updates.platform_fee_amount = ethers.parseEther(editingCampaign.platform_fee_amount).toString();
        } else {
          updates.platform_fee_amount = editingCampaign.platform_fee_amount;
        }
      } else {
        updates.platform_fee_amount = null;
      }

      if (editingCampaign.goal_amount && !editingCampaign.goal_amount.includes('.')) {
        // Already in wei
        updates.goal_amount = editingCampaign.goal_amount;
      } else if (editingCampaign.goal_amount) {
        updates.goal_amount = ethers.parseEther(editingCampaign.goal_amount).toString();
      }

      if (editingCampaign.image_url) {
        updates.image_url = editingCampaign.image_url;
      }

      const { error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', editingCampaign.id);

      if (error) throw error;
      setEditingCampaign(null);
      await refreshData();
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This will also delete all associated donations.')) return;
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const handleBlockUser = async (userId: string, isBlocked: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_blocked: !isBlocked })
        .eq('id', userId);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      alert('Failed to update user status');
    }
  };

  const handleDeleteDonation = async (donationId: string) => {
    if (!confirm('Are you sure you want to delete this donation record?')) return;
    try {
      const { error } = await supabase.from('donations').delete().eq('id', donationId);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error deleting donation:', error);
      alert('Failed to delete donation');
    }
  };

  const handleUpdateDonationStatus = async (donationId: string, newStatus: 'pending' | 'confirmed' | 'failed') => {
    try {
      const { error } = await supabase
        .from('donations')
        .update({ status: newStatus })
        .eq('id', donationId);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error updating donation status:', error);
      alert('Failed to update donation status');
    }
  };

  const handleToggleCampaignStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);
      if (error) throw error;
      await refreshData();
    } catch (error) {
      console.error('Error updating campaign status:', error);
    }
  };

  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalDonations: donations.reduce((sum, d) => sum + BigInt(d.amount || '0'), 0n),
    totalUsers: users.length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {admin.username}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCampaigns}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeCampaigns}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Donations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ethers.formatEther(stats.totalDonations)} ETH
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-teal-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['campaigns', 'donations', 'users', 'analytics'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'campaigns' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Campaign Management</h2>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create Campaign
                      </button>
                    </div>

                    <div className="space-y-4">
                      {campaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          {editingCampaign?.id === campaign.id ? (
                            <div className="space-y-4">
                              <input
                                type="text"
                                value={editingCampaign.title}
                                onChange={(e) =>
                                  setEditingCampaign({ ...editingCampaign, title: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="Title"
                              />
                              <textarea
                                value={editingCampaign.description}
                                onChange={(e) =>
                                  setEditingCampaign({
                                    ...editingCampaign,
                                    description: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder="Description"
                                rows={3}
                              />
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Receiving Wallet Address *
                                </label>
                                <input
                                  type="text"
                                  value={editingCampaign.receiving_wallet_address || ''}
                                  onChange={(e) =>
                                    setEditingCampaign({
                                      ...editingCampaign,
                                      receiving_wallet_address: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                  placeholder="0x..."
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Ethereum address that will receive donations
                                </p>
                              </div>
                              <div className="border-t border-gray-200 pt-3 mt-3">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Platform Fee (Optional)</h4>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      Platform Fee Address
                                    </label>
                                    <input
                                      type="text"
                                      value={editingCampaign.platform_fee_address || ''}
                                      onChange={(e) =>
                                        setEditingCampaign({
                                          ...editingCampaign,
                                          platform_fee_address: e.target.value,
                                        })
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                                      placeholder="0x... (optional)"
                                    />
                                  </div>
                                  {editingCampaign.platform_fee_address && (
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Platform Fee Amount (ETH)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        value={editingCampaign.platform_fee_amount 
                                          ? (editingCampaign.platform_fee_amount.includes('.') 
                                              ? editingCampaign.platform_fee_amount 
                                              : ethers.formatEther(editingCampaign.platform_fee_amount))
                                          : ''}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setEditingCampaign({
                                            ...editingCampaign,
                                            platform_fee_amount: value,
                                          });
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                                        placeholder="0.001"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <select
                                  value={editingCampaign.status}
                                  onChange={(e) =>
                                    setEditingCampaign({
                                      ...editingCampaign,
                                      status: e.target.value as Campaign['status'],
                                    })
                                  }
                                  className="px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                  <option value="completed">Completed</option>
                                </select>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={editingCampaign.is_featured}
                                    onChange={(e) =>
                                      setEditingCampaign({
                                        ...editingCampaign,
                                        is_featured: e.target.checked,
                                      })
                                    }
                                  />
                                  Featured
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleUpdateCampaign}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                  <Save className="w-4 h-4" />
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingCampaign(null)}
                                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {campaign.title}
                                  </h3>
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      campaign.status === 'active'
                                        ? 'bg-green-100 text-green-700'
                                        : campaign.status === 'completed'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {campaign.status}
                                  </span>
                                  {campaign.is_featured && (
                                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                                      Featured
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                                <p className="text-sm text-gray-500">
                                  Goal: {ethers.formatEther(campaign.goal_amount)} ETH | Current:{' '}
                                  {ethers.formatEther(campaign.current_amount)} ETH
                                </p>
                                {campaign.receiving_wallet_address && (
                                  <p className="text-xs text-gray-400 mt-1 font-mono">
                                    Receiving: {campaign.receiving_wallet_address.slice(0, 10)}...
                                    {campaign.receiving_wallet_address.slice(-8)}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => setEditingCampaign(campaign)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleCampaignStatus(campaign)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Toggle Status"
                                >
                                  {campaign.status === 'active' ? (
                                    <XCircle className="w-4 h-4" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteCampaign(campaign.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'donations' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">All Donations</h2>
                      <div className="text-sm text-gray-600">
                        Total: {donations.length} donations
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Donor
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Campaign
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Amount
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {donations.map((donation) => (
                            <tr
                              key={donation.id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 text-sm font-mono text-gray-900">
                                {donation.donor_wallet.slice(0, 8)}...
                                {donation.donor_wallet.slice(-6)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {donation.campaigns?.title || 'Unknown Campaign'}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {ethers.formatEther(donation.amount)} ETH
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={donation.status}
                                  onChange={(e) =>
                                    handleUpdateDonationStatus(
                                      donation.id,
                                      e.target.value as 'pending' | 'confirmed' | 'failed',
                                    )
                                  }
                                  className={`px-2 py-1 text-xs rounded-full border-0 ${
                                    donation.status === 'confirmed'
                                      ? 'bg-green-100 text-green-700'
                                      : donation.status === 'pending'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  <option value="pending">pending</option>
                                  <option value="confirmed">confirmed</option>
                                  <option value="failed">failed</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {new Date(donation.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2 items-center">
                                  <a
                                    href={`https://sepolia.etherscan.io/tx/${donation.transaction_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    View
                                  </a>
                                  <button
                                    onClick={() => handleDeleteDonation(donation.id)}
                                    className="text-sm text-red-600 hover:text-red-700"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'users' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">All Users</h2>
                      <button
                        onClick={fetchData}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        {loading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                    {users.length === 0 && !loading && (
                      <div className="text-center py-8 text-gray-500">
                        No users found. Users will appear here after they sign up and verify their email.
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Display Name
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Wallet Address
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Total Donated
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Donation Count
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr
                              key={user.id}
                              className={`border-b border-gray-100 hover:bg-gray-50 ${
                                user.is_blocked ? 'bg-red-50' : ''
                              }`}
                            >
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {user.email || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {user.display_name || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-gray-900">
                                {user.wallet_address 
                                  ? `${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-6)}`
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {ethers.formatEther(user.total_donated || '0')} ETH
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {user.donation_count || 0}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    user.is_blocked
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}
                                >
                                  {user.is_blocked ? 'Blocked' : 'Active'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleBlockUser(user.id, user.is_blocked || false)}
                                  className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors ${
                                    user.is_blocked
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}
                                >
                                  {user.is_blocked ? 'Unblock' : 'Block'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Analytics Overview</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Campaign Statistics</h3>
                        <ul className="space-y-2 text-sm">
                          <li className="flex justify-between">
                            <span className="text-gray-600">Total Campaigns:</span>
                            <span className="font-semibold">{stats.totalCampaigns}</span>
                          </li>
                          <li className="flex justify-between">
                            <span className="text-gray-600">Active Campaigns:</span>
                            <span className="font-semibold text-green-600">
                              {stats.activeCampaigns}
                            </span>
                          </li>
                          <li className="flex justify-between">
                            <span className="text-gray-600">Completed Campaigns:</span>
                            <span className="font-semibold">
                              {campaigns.filter(c => c.status === 'completed').length}
                            </span>
                          </li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Donation Statistics</h3>
                        <ul className="space-y-2 text-sm">
                          <li className="flex justify-between">
                            <span className="text-gray-600">Total Donations:</span>
                            <span className="font-semibold">
                              {ethers.formatEther(stats.totalDonations)} ETH
                            </span>
                          </li>
                          <li className="flex justify-between">
                            <span className="text-gray-600">Total Transactions:</span>
                            <span className="font-semibold">{donations.length}</span>
                          </li>
                          <li className="flex justify-between">
                            <span className="text-gray-600">Unique Donors:</span>
                            <span className="font-semibold">{stats.totalUsers}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] my-4 flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Create New Campaign</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Campaign title"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newCampaign.description}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Campaign description"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Goal Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newCampaign.goal_amount}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, goal_amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  value={newCampaign.image_url}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, image_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Receiving Wallet Address *
                </label>
                <input
                  type="text"
                  value={newCampaign.receiving_wallet_address}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, receiving_wallet_address: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="0x..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ethereum address that will receive donations for this campaign
                </p>
              </div>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Platform Fee (Optional)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Platform Fee Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCampaign.platform_fee_address}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, platform_fee_address: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                      placeholder="0x... (leave empty to disable platform fee)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ethereum address to receive platform fees. If set, platform fee will be collected on each donation.
                    </p>
                  </div>
                  {newCampaign.platform_fee_address && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Platform Fee Amount (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={newCampaign.platform_fee_amount}
                        onChange={(e) =>
                          setNewCampaign({ ...newCampaign, platform_fee_amount: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="0.001"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Fee amount per transaction. This will be added to the donation amount the user pays.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={newCampaign.status}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        status: e.target.value as CampaignFormState['status'],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCampaign.is_featured}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, is_featured: e.target.checked })
                      }
                    />
                    <span className="text-sm font-semibold text-gray-700">Featured</span>
                  </label>
                </div>
              </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={handleCreateCampaign}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Create Campaign
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

