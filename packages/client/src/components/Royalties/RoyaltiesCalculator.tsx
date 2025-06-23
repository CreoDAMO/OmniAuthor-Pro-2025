import React, { useState, useEffect } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { XIcon, CreditCardIcon } from '@heroicons/react/outline';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { CALCULATE_ROYALTIES, CREATE_COINBASE_CHARGE } from '../../graphql/queries';
import { PROCESS_ROYALTY_PAYOUT } from '../../graphql/mutations';
import { BLOCKCHAIN_CONFIG } from '@omniauthor/shared/src/constants';

import PayoutModal from './PayoutModal';

interface RoyaltyFormData {
  platform: 'KDP' | 'NEURAL_BOOKS' | 'INGRAMSPARK';
  format: 'EBOOK' | 'PAPERBACK' | 'HARDCOVER' | 'AUDIOBOOK';
  price: number;
  pageCount: number;
  genre: string;
}

const RoyaltiesCalculator: React.FC = () => {
  const [formData, setFormData] = useState<RoyaltyFormData>({
    platform: 'NEURAL_BOOKS',
    format: 'EBOOK',
    price: 12.99,
    pageCount: 280,
    genre: 'sci-fi',
  });
  const [formErrors, setFormErrors] = useState<Partial<RoyaltyFormData>>({});
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showCoinbaseModal, setShowCoinbaseModal] = useState(false);
  const [selectedChain, setSelectedChain] = useState<'POLYGON' | 'BASE' | 'SOLANA'>('POLYGON');
  const [coinbaseAmount, setCoinbaseAmount] = useState('');
  const [coinbaseDescription, setCoinbaseDescription] = useState('');

  const [calculateRoyalties, { data: royaltyData, loading: calculating }] = useLazyQuery(
    CALCULATE_ROYALTIES,
    {
      errorPolicy: 'all',
      onError: (error) => toast.error(`Calculation failed: ${error.message}`),
    }
  );

  const [processRoyaltyPayout, { loading: processingPayout }] = useMutation(
    PROCESS_ROYALTY_PAYOUT,
    {
      onCompleted: () => {
        toast.success('Royalty payout initiated!', { id: 'payout-success' });
        setShowPayoutModal(false);
      },
      onError: (error) => toast.error(`Payout failed: ${error.message}`),
    }
  );

  const [createCoinbaseCharge] = useMutation(CREATE_COINBASE_CHARGE, {
    onCompleted: (data) => {
      if (data.createCoinbaseCharge?.redirect_url) {
        window.location.href = data.createCoinbaseCharge.redirect_url;
      }
      toast.success('Coinbase payout initiated', { id: 'coinbase-success' });
      setShowCoinbaseModal(false);
      setCoinbaseAmount('');
      setCoinbaseDescription('');
    },
    onError: (error) => toast.error(`Coinbase payout failed: ${error.message}`),
  });

  useEffect(() => {
    const validateForm = () => {
      const errors: Partial<RoyaltyFormData> = {};
      if (formData.price < 0.99) errors.price = 'Price must be at least $0.99';
      if (formData.pageCount < 50 || formData.pageCount > 1000)
        errors.pageCount = 'Page count must be between 50 and 1000';
      if (!formData.genre) errors.genre = 'Genre is required';
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    };

    if (validateForm()) {
      calculateRoyalties({
        variables: { input: formData },
      });
    }
  }, [formData, calculateRoyalties]);

  const handleInputChange = (field: keyof RoyaltyFormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'price' ? parseFloat(value) || 0 : field === 'pageCount' ? parseInt(value) || 0 : value,
    }));
  };

  const handleProcessPayout = async (walletAddress: string, amount: number) => {
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/) && selectedChain === 'POLYGON') {
      toast.error('Invalid wallet address');
      return;
    }
    try {
      await processRoyaltyPayout({
        variables: {
          input: {
            manuscriptId: 'current', // TODO: Get from context
            amount,
            chain: selectedChain,
            recipientAddress: walletAddress,
          },
        },
      });
    } catch (error) {
      console.error('Payout error:', error);
    }
  };

  const handleCoinbasePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coinbaseAmount || parseFloat(coinbaseAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await createCoinbaseCharge({
        variables: {
          input: {
            name: 'Royalty Payout',
            description: coinbaseDescription || `Royalty payout for ${formData.platform}`,
            amount: parseFloat(coinbaseAmount),
            currency: 'USD',
          },
        },
      });
    } catch (error) {
      console.error('Coinbase payout error:', error);
    }
  };

  const getRecommendedStrategy = () => {
    if (!royaltyData?.calculateRoyalties) return null;
    const calculation = royaltyData.calculateRoyalties;
    if (calculation.platform === 'NEURAL_BOOKS') {
      return {
        title: 'Neural Books Strategy',
        description: 'Maximize earnings with blockchain-backed royalty payments.',
        benefits: [
          `${(calculation.royaltyRate * 100).toFixed(0)}% royalty rate`,
          'Blockchain rights protection',
          'Transparent Coinbase payouts',
          'Global distribution',
        ],
      };
    }
    return {
      title: 'Multi-Platform Strategy',
      description: 'Combine KDP’s reach with Neural Books’ high royalties.',
      benefits: [
        'Broad market exposure',
        'Diversified revenue streams',
        'Cross-platform promotion',
        'Risk mitigation',
      ],
    };
  };

  const chartData = royaltyData?.calculateRoyalties
    ? [
        { name: 'Conservative', monthly: royaltyData.calculateRoyalties.projections.monthly.conservative },
        { name: 'Moderate', monthly: royaltyData.calculateRoyalties.projections.monthly.moderate },
        { name: 'Optimistic', monthly: royaltyData.calculateRoyalties.projections.monthly.optimistic },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="royalties-calculator p-6 bg-white rounded-lg shadow-md"
      data-testid="royalties-calculator"
    >
      <div className="calculator-header flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Royalties Calculator</h3>
        <div className="platform-badges flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              formData.platform === 'NEURAL_BOOKS' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            🎯 Neural Books: 85% royalty
          </span>
        </div>
      </div>

      <div className="calculator-form mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700">Platform</label>
            <select
              value={formData.platform}
              onChange={(e) => handleInputChange('platform', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              data-testid="platform-select"
            >
              <option value="NEURAL_BOOKS">Neural Books (Recommended)</option>
              <option value="KDP">Amazon KDP</option>
              <option value="INGRAMSPARK">IngramSpark</option>
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700">Format</label>
            <select
              value={formData.format}
              onChange={(e) => handleInputChange('format', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            >
              <option value="EBOOK">eBook</option>
              <option value="PAPERBACK">Paperback</option>
              <option value="HARDCOVER">Hardcover</option>
              <option value="AUDIOBOOK">Audiobook (2025)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700">Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.99"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${
                formErrors.price ? 'border-red-500' : ''
              }`}
              data-testid="price-input"
            />
            {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700">Page Count</label>
            <input
              type="number"
              min="50"
              max="1000"
              value={formData.pageCount}
              onChange={(e) => handleInputChange('pageCount', e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${
                formErrors.pageCount ? 'border-red-500' : ''
              }`}
              data-testid="page-count-input"
            />
            {formErrors.pageCount && <p className="text-red-500 text-xs mt-1">{formErrors.pageCount}</p>}
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700">Genre</label>
            <select
              value={formData.genre}
              onChange={(e) => handleInputChange('genre', e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${
                formErrors.genre ? 'border-red-500' : ''
              }`}
            >
              <option value="sci-fi">Science Fiction</option>
              <option value="romance">Romance</option>
              <option value="thriller">Thriller</option>
              <option value="literary">Literary Fiction</option>
              <option value="non-fiction">Non-Fiction</option>
            </select>
            {formErrors.genre && <p className="text-red-500 text-xs mt-1">{formErrors.genre}</p>}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {royaltyData?.calculateRoyalties && (
          <motion.div
            className="calculation-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="results-header flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">{formData.platform} Earnings</h4>
              {formData.platform === 'NEURAL_BOOKS' && (
                <div className="blockchain-indicator flex items-center gap-2">
                  <span className="text-indigo-600">🔗</span>
                  Rights Secured on Blockchain
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="result-card bg-indigo-50 p-4 rounded-md text-center">
                <div className="result-value text-2xl font-bold text-indigo-600">
                  ${royaltyData.calculateRoyalties.authorEarnings.toFixed(2)}
                </div>
                <div className="result-label text-sm text-gray-600">Per Book</div>
                <div className="result-meta text-xs text-gray-500">
                  {(royaltyData.calculateRoyalties.royaltyRate * 100).toFixed(0)}% royalty rate
                </div>
              </div>
              <div className="result-card bg-gray-50 p-4 rounded-md text-center">
                <div className="result-value text-2xl font-bold">
                  ${royaltyData.calculateRoyalties.projections.monthly.moderate.toLocaleString()}
                </div>
                <div className="result-label text-sm text-gray-600">Monthly (Moderate)</div>
                <div className="result-meta text-xs text-gray-500">~150 sales</div>
              </div>
              <div className="result-card bg-gray-50 p-4 rounded-md text-center">
                <div className="result-value text-2xl font-bold">
                  ${royaltyData.calculateRoyalties.projections.annual.moderate.toLocaleString()}
                </div>
                <div className="result-label text-sm text-gray-600">Annual (Moderate)</div>
                <div className="result-meta text-xs text-gray-500">~1,800 sales</div>
              </div>
              {royaltyData.calculateRoyalties.platformFee > 0 && (
                <div className="result-card bg-red-50 p-4 rounded-md text-center">
                  <div className="result-value text-2xl font-bold text-red-600">
                    ${royaltyData.calculateRoyalties.platformFee.toFixed(2)}
                  </div>
                  <div className="result-label text-sm text-gray-600">Platform Fee</div>
                  <div className="result-meta text-xs text-gray-500">
                    {BLOCKCHAIN_CONFIG.PLATFORM_FEE}% service fee
                  </div>
                </div>
              )}
            </div>

            <div className="projections-chart mb-6">
              <h5 className="text-md font-semibold mb-2">Monthly Earning Projections</h5>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="monthly" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {getRecommendedStrategy() && (
              <div className="strategy-recommendation mb-6 p-4 bg-gray-50 rounded-md">
                <h5 className="text-md font-semibold">{getRecommendedStrategy()!.title}</h5>
                <p className="text-sm text-gray-600">{getRecommendedStrategy()!.description}</p>
                <div className="benefits-list flex flex-wrap gap-2 mt-2">
                  {getRecommendedStrategy()!.benefits.map((benefit, index) => (
                    <span
                      key={index}
                      className="benefit-tag px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                    >
                      ✓ {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="action-buttons flex gap-4">
              <button
                className="btn-secondary px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                onClick={() => {
                  const data = {
                    platform: formData.platform,
                    calculation: royaltyData.calculateRoyalties,
                    timestamp: new Date().toISOString(),
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'royalty-calculation.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                📤 Export Calculation
              </button>
              {formData.platform === 'NEURAL_BOOKS' && (
                <>
                  <button
                    className="btn-primary px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    onClick={() => setShowPayoutModal(true)}
                    disabled={processingPayout}
                    data-testid="process-payout-btn"
                  >
                    💰 Blockchain Payout
                  </button>
                  <button
                    className="btn-primary px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={() => setShowCoinbaseModal(true)}
                    disabled={processingPayout}
                    data-testid="pay-with-coinbase-btn"
                  >
                    <CreditCardIcon className="h-5 w-5 inline mr-1" /> Coinbase Payout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {calculating && (
        <motion.div
          className="calculating-indicator flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="spinner h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Calculating earnings...</span>
        </motion.div>
      )}

      <PayoutModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        amount={royaltyData?.calculateRoyalties?.authorEarnings || 0}
        chain={selectedChain}
        onChainChange={setSelectedChain}
        onPayout={handleProcessPayout}
        loading={processingPayout}
        data-testid="payout-modal"
      />

      <Transition show={showCoinbaseModal} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => setShowCoinbaseModal(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            </Transition.Child>

            <span className="inline-block h-screen align-middle" aria-hidden="true">
              &#8203;
            </span>

            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Coinbase Royalty Payout
                </Dialog.Title>
                <button
                  type="button"
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowCoinbaseModal(false)}
                >
                  <XIcon className="h-6 w-6" />
                </button>
                <form onSubmit={handleCoinbasePayout} className="mt-4" data-testid="coinbase-payout-form">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      value={coinbaseAmount}
                      onChange={(e) => setCoinbaseAmount(e.target.value)}
                      required
                      data-testid="coinbase-amount"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      value={coinbaseDescription}
                      onChange={(e) => setCoinbaseDescription(e.target.value)}
                      data-testid="coinbase-description"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                    data-testid="submit-coinbase-payout-btn"
                  >
                    Process Coinbase Payout
                  </button>
                </form>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </motion.div>
  );
};

export default RoyaltiesCalculator;
