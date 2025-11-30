import { useEffect, useState } from 'react';
import { supabase, Campaign } from '../lib/supabase';
import { CampaignCard } from './CampaignCard';
import { Loader, Plus } from 'lucide-react';

import { CampaignDetails } from './CampaignDetails';

interface CampaignsListProps {
  onDonate: (campaign: Campaign) => void;
  walletAddress: string | null;
  onCreateCampaign?: () => void;
}

export function CampaignsList({
  onDonate,
  walletAddress,
  onCreateCampaign,
}: CampaignsListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let isMounted = true;

  const fetchCampaigns = async (): Promise<void> => {
    try {
      setLoading(true);
      let query = supabase.from('campaigns').select('*');

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

        const { data, error } = await query
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        if (isMounted) {
          setCampaigns([]);
        }
        throw error; // Re-throw for polling error handler
      }
      
      // Handle nested data structure from API
      let campaignsArray = data;
      if (data && typeof data === 'object' && !Array.isArray(data) && data.data) {
        campaignsArray = Array.isArray(data.data) ? data.data : [data.data];
      }
      
      if (isMounted) {
        setCampaigns(Array.isArray(campaignsArray) ? campaignsArray : []);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      throw err; // Re-throw for polling error handler
    } finally {
      if (isMounted) {
      setLoading(false);
      }
    }
  };

    // Fetch campaigns once on mount or when filter changes
    void fetchCampaigns();

    // Cleanup on unmount
    return () => {
      isMounted = false;
    };
  }, [filter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Campaigns</h1>
          <p className="text-gray-600">
            Support causes through transparent blockchain donations
          </p>
        </div>
        {walletAddress && onCreateCampaign && (
          <button
            onClick={onCreateCampaign}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-full font-semibold hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-8">
        {(['all', 'active', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              filter === status
                ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">No campaigns found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onDonate={onDonate}
              onViewDetails={(selected) => {
                setSelectedCampaign(selected);
                setShowDetails(true);
              }}
            />
          ))}
        </div>
      )}

      {selectedCampaign && showDetails && (
        <CampaignDetails
          campaign={selectedCampaign}
          onClose={() => {
            setShowDetails(false);
            setSelectedCampaign(null);
          }}
        />
      )}
    </div>
  );
}
