import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
}

export function Hero({ onExplore }: HeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-4 py-2 bg-blue-100 rounded-full text-sm font-semibold text-blue-700">
                Transparent Giving Platform
              </div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-teal-600 bg-clip-text text-transparent leading-tight">
                Donations You Can Trust
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Support Pakistan's causes with complete transparency. Every donation is tracked and verified. No hidden funds. No manipulation.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onExplore}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-full font-semibold hover:shadow-2xl transition-all transform hover:scale-105"
              >
                Explore Campaigns
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-full font-semibold hover:border-blue-600 hover:text-blue-600 transition-all">
                Learn More
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div>
                <div className="text-3xl font-bold text-blue-600">100%</div>
                <p className="text-sm text-gray-600 mt-2">Transparent</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-teal-600">0%</div>
                <p className="text-sm text-gray-600 mt-2">Hidden Fees</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">✓</div>
                <p className="text-sm text-gray-600 mt-2">Verified</p>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative hidden md:block">
            <div className="relative w-full aspect-square">
              {/* Gradient cards stack */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl transform rotate-6 shadow-2xl opacity-10"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl transform -rotate-3 shadow-2xl opacity-20"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-teal-500 to-teal-600 rounded-3xl shadow-2xl opacity-30 p-8 flex flex-col justify-end space-y-4">
                <div className="flex gap-3">
                  <Shield className="w-6 h-6 text-white" />
                  <div>
                    <p className="text-white font-semibold">Secure & Verified</p>
                    <p className="text-blue-100 text-sm">Secure platform</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Zap className="w-6 h-6 text-white" />
                  <div>
                    <p className="text-white font-semibold">Lightning Fast</p>
                    <p className="text-blue-100 text-sm">Instant transactions</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Globe className="w-6 h-6 text-white" />
                  <div>
                    <p className="text-white font-semibold">Global Access</p>
                    <p className="text-blue-100 text-sm">Donate from anywhere</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
