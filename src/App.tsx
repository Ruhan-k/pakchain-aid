import { useState, useEffect, useCallback } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase, Campaign } from './lib/supabase';
import { connectWallet, getCurrentNetwork, switchToSepolia } from './lib/web3';
import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { CampaignsList } from './components/CampaignsList';
import { Dashboard } from './components/Dashboard';
import { DonationModal } from './components/DonationModal';
import { Chatbot } from './components/Chatbot';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { UserAuth } from './components/UserAuth';
import { About } from './components/About';
import { Contact } from './components/Contact';
import { getAdminSession, clearAdminSession, Admin } from './lib/adminAuth';
import { ethers } from 'ethers';

type Page = 'home' | 'campaigns' | 'dashboard' | 'about' | 'contact';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(window.location.pathname === '/admin');
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [user, setUser] = useState<SupabaseAuthUser | null>(null);

  // Check URL path for /admin route when path changes
  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        setShowAdminLogin(true);
      } else {
        setShowAdminLogin(false);
      }
    };

    // Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', checkPath);

    return () => {
      window.removeEventListener('popstate', checkPath);
    };
  }, []);

  const checkUserSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  }, []);

  const handleUserAuthSuccess = useCallback(() => {
    setShowUserAuth(false);
    checkUserSession();
  }, [checkUserSession]);

  const checkAdminSession = useCallback(() => {
    const session = getAdminSession();
    if (session) {
      setAdmin(session);
    }
  }, []);

  const handleAdminLogin = useCallback((loggedInAdmin: Admin) => {
    setAdmin(loggedInAdmin);
    setShowAdminLogin(false);
    // Update URL to remove /admin from path after successful login
    window.history.replaceState({}, '', '/');
  }, []);

  const handleAdminLogout = useCallback(() => {
    clearAdminSession();
    setAdmin(null);
  }, []);

  const checkNetwork = useCallback(async () => {
    try {
      const network = await getCurrentNetwork();
      setIsCorrectNetwork(Number(network.chainId) === 11155111);
    } catch {
      setIsCorrectNetwork(false);
    }
  }, []);

  const checkWalletConnection = useCallback(async () => {
    try {
      if (!window.ethereum) return;

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        await checkNetwork();
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
    }
  }, [checkNetwork]);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length > 0) {
      setWalletAddress(accounts[0]);
    } else {
      setWalletAddress(null);
    }
  }, []);

  useEffect(() => {
    checkWalletConnection();
    checkAdminSession();
    checkUserSession();

    const handleChainChanged = () => window.location.reload();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setUser(session?.user || null);

      // Handle sign out event
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }

      // When user signs in (e.g., after clicking confirmation link), create/update user record
      if (session?.user) {
    try {
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id, display_name, email')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (fetchError) {
            console.error('Error fetching user:', fetchError);
          }

          if (!existingUser) {
            // Create new user record with auth info
            const displayName = session.user.user_metadata?.display_name ||
              session.user.email?.split('@')[0] ||
              'User';

            const { error: insertError } = await supabase
              .from('users')
              .insert({
                auth_user_id: session.user.id,
                email: session.user.email,
                display_name: displayName,
                wallet_address: null, // Will be set when they connect wallet or donate
              });

            if (insertError) {
              if (insertError.code === '23505') {
                console.warn('User already exists for auth_user_id, skipping insert.');
              } else {
                console.error('Error creating user record:', insertError);
                console.error('Tip: Ensure users.auth_user_id is unique or clean duplicates manually.');
              }
            } else {
              console.log('User record created successfully:', {
                auth_user_id: session.user.id,
                email: session.user.email,
                display_name: displayName,
              });
            }
          } else {
            // Update existing user with latest info
            const updates: Record<string, unknown> = {};

            if (session.user.email && !existingUser.email) {
              updates.email = session.user.email;
            }

            const displayName = session.user.user_metadata?.display_name ||
                               existingUser.display_name ||
                               session.user.email?.split('@')[0] ||
                               'User';

            if (displayName !== existingUser.display_name) {
              updates.display_name = displayName;
            }

            if (Object.keys(updates).length > 0) {
              const { error: updateError } = await supabase
                .from('users')
                .update(updates)
                .eq('auth_user_id', session.user.id);

              if (updateError) {
                console.error('Error updating user record:', updateError);
              } else {
                console.log('User record updated successfully:', updates);
              }
            }
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error);
        }
      }
    });

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
      authListener.subscription.unsubscribe();
    };
  }, [checkWalletConnection, checkAdminSession, checkUserSession, handleAccountsChanged]);

  const handleConnectWallet = async () => {
    // Check if user is signed in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Please sign in first before connecting your wallet.');
      setShowUserAuth(true);
      return;
    }

    try {
      const address = await connectWallet();
      setWalletAddress(address);
      await switchToSepolia();
      await checkNetwork();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const mobileMessage = isMobile 
        ? '\n\nOn mobile, open this site inside your Ethereum wallet app\'s browser (e.g. MetaMask, Trust Wallet) to connect your wallet.'
        : '';
      alert('Failed to connect wallet. Please make sure MetaMask is installed.' + mobileMessage);
    }
  };

  const handleDonationClick = async (campaign: Campaign) => {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert('Please sign in first to make a donation. This helps us track your donation history and keep your account secure.');
      setShowUserAuth(true);
      return;
    }

    if (!walletAddress) {
      alert('Please connect your wallet first');
      handleConnectWallet();
      return;
    }

    if (!isCorrectNetwork) {
      alert('Please switch to Sepolia testnet');
      switchToSepolia();
      return;
    }

    // Check if user is blocked
    if (walletAddress) {
      const { data: user } = await supabase
        .from('users')
        .select('is_blocked')
        .eq('wallet_address', walletAddress)
        .maybeSingle();
      
      if (user?.is_blocked) {
        alert('Your account has been blocked. Please contact support.');
        return;
      }
    }

    setSelectedCampaign(campaign);
    setShowDonationModal(true);
  };

  const handleDonate = async (amount: string): Promise<string | null> => {
    if (!selectedCampaign || !walletAddress) return null;

    // Check if campaign has receiving wallet address
    if (!selectedCampaign.receiving_wallet_address) {
      throw new Error('This campaign does not have a receiving wallet address configured. Please contact the administrator.');
    }

    try {
      // Send donation with platform fee if enabled
      const { sendDonationWithFee, sendDonationDirect, verifyTransaction, getProvider } = await import('./lib/web3');
      
      let txHash: string;
      
      // Check if platform fee is enabled
      if (selectedCampaign.platform_fee_address && selectedCampaign.platform_fee_amount) {
        const platformFeeEth = ethers.formatEther(selectedCampaign.platform_fee_amount);
        txHash = await sendDonationWithFee(
          selectedCampaign.receiving_wallet_address,
          selectedCampaign.platform_fee_address,
          amount,
          platformFeeEth,
        );
      } else {
        // No platform fee, use direct donation
        txHash = await sendDonationDirect(selectedCampaign.receiving_wallet_address, amount);
      }

      // Wait for transaction to be mined
      const provider = await getProvider();
      await provider.waitForTransaction(txHash);

      // Verify transaction on-chain
      const amountInWei = ethers.parseEther(amount).toString();
      const verification = await verifyTransaction(
        txHash,
        selectedCampaign.receiving_wallet_address,
        amountInWei,
      );

      if (!verification.verified) {
        throw new Error('Transaction verification failed. Please contact support.');
      }

      // Record donation with verified transaction details
      await recordDonation(
        selectedCampaign.id,
        amount,
        txHash,
        walletAddress,
        verification.blockNumber,
        verification.timestamp,
      );

      return txHash;
    } catch (error) {
      console.error('Donation error:', error);
      throw error;
    }
  };

  const recordDonation = async (
    campaignId: string,
    amount: string,
    txHash: string,
    wallet: string,
    blockNumber?: number,
    timestamp?: number,
  ) => {
    try {
      const amountInWei = ethers.parseEther(amount).toString();

      const { error: donError } = await supabase.from('donations').insert({
        campaign_id: campaignId,
        donor_wallet: wallet,
        amount: amountInWei,
        transaction_hash: txHash,
        status: blockNumber ? 'confirmed' : 'pending',
        block_number: blockNumber || null,
        timestamp_on_chain: timestamp || null,
      });

      if (donError) throw donError;

      const currentCampaign = selectedCampaign;
      if (currentCampaign) {
        const newTotal = (BigInt(currentCampaign.current_amount) + BigInt(amountInWei)).toString();

        await supabase
          .from('campaigns')
          .update({ current_amount: newTotal })
          .eq('id', campaignId);
      }

      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;

      // Try to find user by wallet address first
      const { data: walletUser } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', wallet)
        .maybeSingle();

      if (walletUser) {
        // Update existing user by wallet
        const userTotal = (BigInt(walletUser.total_donated || '0') + BigInt(amountInWei)).toString();
        await supabase
          .from('users')
          .update({
            total_donated: userTotal,
            donation_count: (walletUser.donation_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('wallet_address', wallet);

        // If logged in and wallet user doesn't have auth_user_id, link them
        if (authUser && !walletUser.auth_user_id) {
          await supabase
            .from('users')
            .update({
              auth_user_id: authUser.id,
              email: authUser.email || walletUser.email,
            })
            .eq('wallet_address', wallet);
        }
      } else if (authUser) {
        // User is logged in but no wallet record exists - create/update by auth_user_id
        const { data: authUserRecord } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

        if (authUserRecord) {
          // Update existing auth user with wallet address
          const userTotal = (BigInt(authUserRecord.total_donated || '0') + BigInt(amountInWei)).toString();
          await supabase
            .from('users')
            .update({
              wallet_address: wallet,
              total_donated: userTotal,
              donation_count: (authUserRecord.donation_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('auth_user_id', authUser.id);
        } else {
          // Create new user record
          await supabase.from('users').upsert(
            {
              auth_user_id: authUser.id,
              email: authUser.email,
              wallet_address: wallet,
              total_donated: amountInWei,
              donation_count: 1,
              first_donation_at: new Date().toISOString(),
            },
            { onConflict: 'auth_user_id' },
          );
        }
      } else {
        // No auth user, create wallet-only record
        await supabase.from('users').insert({
          wallet_address: wallet,
          total_donated: amountInWei,
          donation_count: 1,
          first_donation_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error recording donation:', error);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Hero onExplore={() => setCurrentPage('campaigns')} />;
      case 'campaigns':
        return (
          <CampaignsList
            onDonate={handleDonationClick}
            walletAddress={walletAddress}
          />
        );
      case 'dashboard':
        return <Dashboard />;
      case 'about':
        return <About />;
      case 'contact':
        return <Contact />;
      default:
        return <Hero onExplore={() => setCurrentPage('campaigns')} />;
    }
  };

  // If admin is logged in, show admin dashboard
  if (admin) {
    return <AdminDashboard admin={admin} onLogout={handleAdminLogout} />;
  }

  // If showing admin login (via /admin URL), show login page
  if (showAdminLogin || window.location.pathname === '/admin') {
    return (
      <AdminLogin
        onLoginSuccess={handleAdminLogin}
        onCancel={() => {
          setShowAdminLogin(false);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation
        walletAddress={walletAddress}
        onConnectWallet={handleConnectWallet}
        onNavigate={(page) => setCurrentPage(page as Page)}
        currentPage={currentPage}
        onUserAuth={() => setShowUserAuth(true)}
        user={user}
      />

      {selectedCampaign && (
        <DonationModal
          campaign={selectedCampaign}
          isOpen={showDonationModal}
          onClose={() => {
            setShowDonationModal(false);
            setSelectedCampaign(null);
          }}
          onDonate={handleDonate}
        />
      )}

      <main>{renderPage()}</main>

      <Chatbot />

      {showUserAuth && (
        <UserAuth
          onClose={() => setShowUserAuth(false)}
          onSuccess={handleUserAuthSuccess}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-gray-900 mb-4">PakChain Aid</h3>
              <p className="text-sm text-gray-600">
                Transparent blockchain donations for Pakistan's causes.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <button
                    onClick={() => setCurrentPage('campaigns')}
                    className="hover:text-blue-600 transition-colors"
                  >
                    Campaigns
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage('dashboard')}
                    className="hover:text-blue-600 transition-colors"
                  >
                    Analytics
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage('about')}
                    className="hover:text-blue-600 transition-colors"
                  >
                    About Us
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Blockchain</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a
                    href="https://sepolia.etherscan.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors"
                  >
                    Sepolia Explorer
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.alchemy.com/faucets/ethereum-sepolia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors"
                  >
                    Get Testnet ETH
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Security</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>All transactions are public</li>
                <li>Smart contract backed</li>
                <li>Non-custodial</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8">
            <p className="text-center text-sm text-gray-600">
              © 2024 PakChain Aid. All transactions recorded on Ethereum blockchain.
            </p>
            <p className="text-center text-xs text-gray-500 mt-2">
              Blockchain course project under the guidance of Dr. Shahbaz Siddiqui, PhD
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
