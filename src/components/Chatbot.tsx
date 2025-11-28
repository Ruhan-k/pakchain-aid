import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Loader, Bot, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ethers } from 'ethers';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m the PakChain Aid assistant. I can help you with:\n\n• Donation statistics\n• Campaign information\n• How to donate\n• Blockchain transparency\n\nWhat would you like to know?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRealData = async () => {
    try {
      // Fetch campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('current_amount', { ascending: false });

      // Fetch donations
      const { data: donations } = await supabase
        .from('donations')
        .select('*')
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(100);

      // Calculate stats
      const totalDonations = donations?.reduce(
        (sum, d) => sum + BigInt(d.amount || '0'),
        0n,
      ) || 0n;
      const uniqueDonors = new Set(donations?.map((d) => d.donor_wallet) || []).size;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayDonations = donations?.filter(
        (d) => new Date(d.created_at) >= today,
      ) || [];
      const todayTotal = todayDonations.reduce(
        (sum, d) => sum + BigInt(d.amount || '0'),
        0n,
      );

      return {
        campaigns: campaigns || [],
        totalDonations,
        uniqueDonors,
        totalDonationCount: donations?.length || 0,
        todayTotal,
        todayCount: todayDonations.length,
      };
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  };

  const generateBotResponse = async (userMessage: string): Promise<string> => {
    const lower = userMessage.toLowerCase();
    const data = await fetchRealData();

    // Statistics queries
    if (
      (lower.includes('how much') || lower.includes('total')) &&
      (lower.includes('donate') || lower.includes('donation'))
    ) {
      if (data) {
        const totalEth = ethers.formatEther(data.totalDonations);
        return `Total donations across all campaigns: **${totalEth} ETH** from **${data.uniqueDonors} unique donors** with **${data.totalDonationCount} transactions**. Would you like to see breakdown by campaign?`;
      }
      return 'I\'m having trouble fetching the latest statistics. Please try again in a moment.';
    }

    if (lower.includes('today') || lower.includes('24 hour') || lower.includes('recent')) {
      if (data) {
        const todayEth = ethers.formatEther(data.todayTotal);
        return `In the last 24 hours: **${todayEth} ETH** donated across **${data.todayCount} transactions**. The platform is actively receiving support!`;
      }
      return 'I\'m having trouble fetching today\'s statistics. Please try again.';
    }

    // Campaign queries
    if (lower.includes('campaign') || lower.includes('cause')) {
      if (data && data.campaigns.length > 0) {
        const topCampaigns = data.campaigns.slice(0, 3);
        let response = `We currently have **${data.campaigns.length} active campaigns**:\n\n`;
        topCampaigns.forEach((campaign, idx) => {
          const current = ethers.formatEther(campaign.current_amount);
          const goal = ethers.formatEther(campaign.goal_amount);
          const progress = ((Number(campaign.current_amount) / Number(campaign.goal_amount)) * 100).toFixed(1);
          response += `${idx + 1}. **${campaign.title}** - ${current} ETH / ${goal} ETH (${progress}%)\n`;
        });
        response += '\nWhich campaign interests you?';
        return response;
      }
      return 'I\'m having trouble fetching campaign information. Please try again.';
    }

    // Donor queries
    if (
      lower.includes('donor') ||
      lower.includes('contributor') ||
      lower.includes('supporter')
    ) {
      if (data) {
        return `We have **${data.uniqueDonors} unique donors** supporting PakChain Aid causes. Each donation is permanently recorded on the Ethereum blockchain for complete transparency. Thank you to all our supporters!`;
      }
      return 'I\'m having trouble fetching donor information. Please try again.';
    }

    // Transparency/Blockchain queries
    if (
      lower.includes('transparent') ||
      lower.includes('blockchain') ||
      lower.includes('verify') ||
      lower.includes('etherscan')
    ) {
      return `Every donation is recorded on the **Ethereum blockchain**, making it:\n\n• **Immutable** - Cannot be altered\n• **Publicly verifiable** - View on Etherscan\n• **Transparent** - Complete transaction history\n• **Trustless** - No intermediaries\n\nAll transactions can be viewed on [Sepolia Etherscan](https://sepolia.etherscan.io). This ensures complete transparency and trust!`;
    }

    // How to donate
    if (
      lower.includes('how to') ||
      lower.includes('donate') ||
      lower.includes('contribute') ||
      lower.includes('support')
    ) {
      return `To make a donation:\n\n1. **Connect your wallet** - Click "Connect Wallet" in the navigation\n2. **Browse campaigns** - Go to the Campaigns page\n3. **Select a campaign** - Click "Donate Now" on any campaign\n4. **Enter amount** - Choose your donation amount in ETH\n5. **Confirm transaction** - Approve in your MetaMask wallet\n6. **Done!** - Your donation is recorded on the blockchain\n\nAll donations go directly to the campaign's receiving wallet address.`;
    }

    // Help
    if (lower.includes('help') || lower.includes('what can') || lower.includes('assist')) {
      return `I can help you with:\n\n• **Statistics** - Total donations, today's donations, donor counts\n• **Campaigns** - Active campaigns, progress, goals\n• **How to donate** - Step-by-step donation guide\n• **Transparency** - Blockchain verification, Etherscan links\n• **General info** - About PakChain Aid\n\nWhat would you like to know?`;
    }

    // Thank you
    if (lower.includes('thank')) {
      return 'You\'re welcome! Your support makes a real difference. Would you like to explore campaigns or learn more about our impact?';
    }

    // Default response
    return 'I can help with information about campaigns, donations, and statistics. Try asking:\n\n• "How much has been donated?"\n• "Show me active campaigns"\n• "How do I donate?"\n• "Tell me about transparency"';
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const botResponseText = await generateBotResponse(input);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-full shadow-lg hover:shadow-2xl transition-all transform hover:scale-110 z-[99] animate-pulse"
        aria-label="Open chatbot"
        title="Open chatbot"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] sm:w-96 h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col z-[100] border border-gray-200 flex-shrink-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-500 text-white px-4 sm:px-6 py-4 rounded-t-2xl flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <h3 className="font-bold text-base sm:text-lg">PakChain Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
          aria-label="Close chatbot"
          title="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4 bg-gray-50 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.sender === 'bot' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-xs px-4 py-3 rounded-2xl text-sm ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-br-none'
                  : 'bg-white text-gray-900 rounded-bl-none shadow-sm border border-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {message.sender === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-gray-100">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-3 sm:px-4 py-4 bg-white rounded-b-2xl flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm transition-colors"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="p-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Powered by PakChain Aid • Real-time data
        </p>
      </div>
    </div>
  );
}
