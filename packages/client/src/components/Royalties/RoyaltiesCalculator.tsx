import React, { useState, useEffect } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';


import { CALCULATE_ROYALTIES } from '../../graphql/queries';
import { PROCESS_ROYALTY_PAYOUT } from '../../graphql/mutations';
import { ROYALTY_RATES, BLOCKCHAIN_CONFIG } from '@omniauthor/shared';


import BlockchainSelector from '../Blockchain/BlockchainSelector';
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


  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedChain, setSelectedChain] = useState<'POLYGON' | 'BASE' | 'SOLANA'>('POLYGON');


  const [calculateRoyalties, { data: royaltyData, loading: calculating }] = useLazyQuery(
    CALCULATE_ROYALTIES,
    {
      errorPolicy: 'all',
    }
  );


  const [processRoyaltyPayout, { loading: processingPayout }] = useMutation(
    PROCESS_ROYALTY_PAYOUT,
    {
      onCompleted: () => {
        toast.success('Royalty payout initiated!');
        setShowPayoutModal(false);
      },
      onError: (error) => {
        toast.error(`Payout failed: ${error.message}`);
      },
    }
  );


  // Auto-calculate when form changes
  useEffect(() => {
    if (formData.price > 0) {
      calculateRoyalties({
        variables: {
          input: formData,
        },
      });
    }
  }, [formData, calculateRoyalties]);


  const handleInputChange = (field: keyof RoyaltyFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };


  const handleProcessPayout = async (walletAddress: string, amount: number) => {
    try {
      await processRoyaltyPayout({
        variables: {
          input: {
            manuscriptId: 'current', // Get from context
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


  const getRecommendedStrategy = () => {
    if (!royaltyData?.calculateRoyalties) return null;


    const calculation = royaltyData.calculateRoyalties;
    
    if (calculation.platform === 'NEURAL_BOOKS') {
      return {
        title: 'Recommended Strategy',
        description: 'Neural Books offers the highest royalty rate with blockchain rights protection.',
        benefits: [
          `${(calculation.royaltyRate * 100).toFixed(0)}% royalty rate`,
          'Blockchain rights secured',
          'Transparent payments',
          'Global distribution',
        ],
      };
    }


    return {
      title: 'Multi-Platform Strategy',
      description: 'Consider starting with KDP for reach, then adding Neural Books for higher royalties.',
      benefits: [
        'Maximum market reach',
        'Diversified income',
        'Risk mitigation',
        'Cross-platform promotion',
      ],
    };
  };


  return (
    <div className="royalties-calculator">
      <div className="calculator-header">
        <h3>Live Royalties Calculator</h3>
        <div className="platform-badges">
          <span className={`platform-badge ${formData.platform === 'NEURAL_BOOKS' ? 'recommended' : ''}`}>
            🎯 Neural Books: 85% royalty
          </span>
        </div>
      </div>


      <div className="calculator-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Platform</label>
            <select
              value={formData.platform}
              onChange={(e) => handleInputChange('platform', e.target.value as any)}
              className="form-select"
            >
              <option value="NEURAL_BOOKS">Neural Books (Recommended)</option>
              <option value="KDP">Amazon KDP</option>
              <option value="INGRAMSPARK">IngramSpark</option>
            </select>
          </div>


          <div className="form-group">
            <label>Format</label>
            <select
              value={formData.format}
              onChange={(e) => handleInputChange('format', e.target.value as any)}
              className="form-select"
            >
              <option value="EBOOK">eBook</option>
              <option value="PAPERBACK">Paperback</option>
              <option value="HARDCOVER">Hardcover</option>
              <option value="AUDIOBOOK">Audiobook (2025)</option>
            </select>
          </div>


          <div className="form-group">
            <label>Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.99"
              value={formData.price}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
              className="form-input"
            />
          </div>


          <div className="form-group">
            <label>Page Count</label>
            <input
              type="number"
              min="50"
              max="1000"
              value={formData.pageCount}
              onChange={(e) => handleInputChange('pageCount', parseInt(e.target.value))}
              className="form-input"
            />
          </div>


          <div className="form-group">
            <label>Genre</label>
            <select
              value={formData.genre}
              onChange={(e) => handleInputChange('genre', e.target.value)}
              className="form-select"
            >
              <option value="sci-fi">Science Fiction</option>
              <option value="romance">Romance</option>
              <option value="thriller">Thriller</option>
              <option value="literary">Literary Fiction</option>
              <option value="non-fiction">Non-Fiction</option>
            </select>
          </div>
        </div>
      </div>


      {royaltyData?.calculateRoyalties && (
        <motion.div
          className="calculation-results"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="results-header">
            <h4>{formData.platform} Earnings</h4>
            {formData.platform === 'NEURAL_BOOKS' && (
              <div className="blockchain-indicator">
                <span className="blockchain-icon">🔗</span>
                Rights Secured on Blockchain
              </div>
            )}
          </div>


          <div className="results-grid">
            <div className="result-card primary">
              <div className="result-value">
                ${royaltyData.calculateRoyalties.authorEarnings.toFixed(2)}
              </div>
              <div className="result-label">Per Book</div>
              <div className="result-meta">
                {(royaltyData.calculateRoyalties.royaltyRate * 100).toFixed(0)}% royalty rate
              </div>
            </div>


            <div className="result-card">
              <div className="result-value">
                ${royaltyData.calculateRoyalties.projections.monthly.moderate.toLocaleString()}
              </div>
              <div className="result-label">Monthly (Moderate)</div>
              <div className="result-meta">~150 sales</div>
            </div>


            <div className="result-card">
              <div className="result-value">
                ${royaltyData.calculateRoyalties.projections.annual.moderate.toLocaleString()}
              </div>
              <div className="result-label">Annual (Moderate)</div>
              <div className="result-meta">~1,800 sales</div>
            </div>


            {royaltyData.calculateRoyalties.platformFee > 0 && (
              <div className="result-card fee">
                <div className="result-value">
                  ${royaltyData.calculateRoyalties.platformFee.toFixed(2)}
                </div>
                <div className="result-label">Platform Fee</div>
                <div className="result-meta">
                  {BLOCKCHAIN_CONFIG.PLATFORM_FEE}% service fee
                </div>
              </div>
            )}
          </div>


          <div className="projections-range">
            <h5>Earning Projections (Monthly)</h5>
            <div className="range-bar">
              <div className="range-segment conservative">
                <span className="range-label">Conservative</span>
                <span className="range-value">
                  ${royaltyData.calculateRoyalties.projections.monthly.conservative.toLocaleString()}
                </span>
              </div>
              <div className="range-segment moderate active">
                <span className="range-label">Moderate</span>
                <span className="range-value">
                  ${royaltyData.calculateRoyalties.projections.monthly.moderate.toLocaleString()}
                </span>
              </div>
              <div className="range-segment optimistic">
                <span className="range-label">Optimistic</span>
                <span className="range-value">
                  ${royaltyData.calculateRoyalties.projections.monthly.optimistic.toLocaleString()}
                </span>
              </div>
            </div>
          </div>


          {getRecommendedStrategy() && (
            <div className="strategy-recommendation">
              <h5>{getRecommendedStrategy()!.title}</h5>
              <p>{getRecommendedStrategy()!.description}</p>
              <div className="benefits-list">
                {getRecommendedStrategy()!.benefits.map((benefit, index) => (
                  <span key={index} className="benefit-tag">
                    ✓ {benefit}
                  </span>
                ))}
              </div>
            </div>
          )}


          <div className="action-buttons">
            <button
              className="btn-secondary"
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
              <button
                className="btn-primary"
                onClick={() => setShowPayoutModal(true)}
                disabled={processingPayout}
              >
                💰 Process Payout
              </button>
            )}
          </div>
        </motion.div>
      )}


      {calculating && (
        <div className="calculating-indicator">
          <div className="spinner"></div>
          <span>Calculating earnings...</span>
        </div>
      )}


      <PayoutModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        amount={royaltyData?.calculateRoyalties?.authorEarnings || 0}
        chain={selectedChain}
        onChainChange={setSelectedChain}
        onPayout={handleProcessPayout}
        loading={processingPayout}
      />
    </div>
  );
};


export default RoyaltiesCalculator;
