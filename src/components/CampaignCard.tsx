import { Campaign } from '../lib/supabase';
import { TrendingUp } from 'lucide-react';
import { ethers } from 'ethers';

interface CampaignCardProps {
  campaign: Campaign;
  onDonate: (campaign: Campaign) => void;
  onViewDetails?: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, onDonate, onViewDetails }: CampaignCardProps) {
  const goalNum = BigInt(campaign.goal_amount);
  const currentNum = BigInt(campaign.current_amount);
  const percentage =
    goalNum > 0n ? Math.min((Number(currentNum) / Number(goalNum)) * 100, 100) : 0;

  const currentEth = ethers.formatEther(currentNum);
  const goalEth = ethers.formatEther(goalNum);

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      {/* Image with overlay */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-teal-500 overflow-hidden">
        {campaign.image_url ? (
          <img
            src={campaign.image_url}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
            <TrendingUp className="w-12 h-12 text-white opacity-50" />
          </div>
        )}
        {campaign.is_featured && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
            Featured
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-t from-black/30 to-transparent group-hover:from-black/50 transition-colors"></div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
            {campaign.title}
          </h3>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {campaign.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-teal-500 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-900">
              {currentEth} / {goalEth} ETH
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>

        {/* Status Badge and Button */}
        <div className="flex gap-2 items-center pt-2">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              campaign.status === 'active'
                ? 'bg-green-100 text-green-700'
                : campaign.status === 'completed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
        </div>

        <div className="flex flex-col gap-3 mt-4">
        {campaign.status === 'active' && (
          <button
            onClick={() => onDonate(campaign)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 duration-200"
          >
            Donate Now
          </button>
        )}
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(campaign)}
              className="w-full px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-blue-600 hover:text-blue-600 transition-all"
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
