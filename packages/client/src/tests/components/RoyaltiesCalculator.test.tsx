import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import RoyaltiesCalculator from '../../components/Royalties/RoyaltiesCalculator';
import { CALCULATE_ROYALTIES, CREATE_COINBASE_CHARGE } from '../../graphql/queries';
import { PROCESS_ROYALTY_PAYOUT } from '../../graphql/mutations';
import { SUBSCRIPTION_PLANS, ROYALTY_RATES, BLOCKCHAIN_CONFIG } from '@omniauthor/shared';

const mocks = [
  {
    request: {
      query: CALCULATE_ROYALTIES,
      variables: {
        input: {
          platform: 'NEURAL_BOOKS',
          format: 'EBOOK',
          price: 12.99,
          pageCount: 280,
          genre: 'sci-fi',
        },
      },
    },
    result: {
      data: {
        calculateRoyalties: {
          platform: 'NEURAL_BOOKS',
          format: 'EBOOK',
          price: 12.99,
          royaltyRate: 0.85,
          platformFee: 0.65,
          authorEarnings: 10.39,
          projections: {
            monthly: {
              conservative: 519.5,
              moderate: 1558.5,
              optimistic: 4156.0,
            },
            annual: {
              conservative: 6234.0,
              moderate: 18702.0,
              optimistic: 49872.0,
            },
          },
        },
      },
    },
  },
  {
    request: {
      query: CREATE_COINBASE_CHARGE,
      variables: {
        input: {
          name: 'Royalty Payout',
          description: 'Royalty payout for NEURAL_BOOKS',
          amount: 15.0,
          currency: 'USD',
        },
      },
    },
    result: {
      data: {
        createCoinbaseCharge: {
          id: 'charge123',
          code: 'CODE123',
          name: 'Royalty Payout',
          description: 'Royalty payout for NEURAL_BOOKS',
          local_price: { amount: 15.0, currency: 'USD' },
          redirect_url: 'https://commerce.coinbase.com/charge/CODE123',
          cancel_url: 'https://commerce.coinbase.com/charge/CODE123/cancel',
        },
      },
    },
  },
  {
    request: {
      query: PROCESS_ROYALTY_PAYOUT,
      variables: {
        input: {
          manuscriptId: 'current',
          amount: 10.39,
          chain: 'POLYGON',
          recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
      },
    },
    result: {
      data: {
        processRoyaltyPayout: {
          id: 'payout123',
          status: 'SUCCESS',
        },
      },
    },
  },
];

const renderComponent = () => {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <BrowserRouter>
        <RoyaltiesCalculator />
      </BrowserRouter>
    </MockedProvider>
  );
};

describe('RoyaltiesCalculator', () => {
  it('renders calculator form correctly', () => {
    renderComponent();

    expect(screen.getByTestId('royalties-calculator')).toBeInTheDocument();
    expect(screen.getByLabelText('Platform')).toBeInTheDocument();
    expect(screen.getByLabelText('Format')).toBeInTheDocument();
    expect(screen.getByTestId('price-input')).toBeInTheDocument();
    expect(screen.getByTestId('page-count-input')).toBeInTheDocument();
    expect(screen.getByLabelText('Genre')).toBeInTheDocument();
  });

  it('shows Neural Books as recommended platform', () => {
    renderComponent();

    expect(screen.getByText(/Neural Books: 85% royalty/)).toHaveClass('bg-indigo-100');
    expect(screen.getByTestId('platform-select')).toHaveValue('NEURAL_BOOKS');
  });

  it('calculates royalties when form values change', async () => {
    renderComponent();

    const priceInput = screen.getByTestId('price-input');
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '15.99');

    await waitFor(() => {
      expect(screen.getByText('$10.39')).toBeInTheDocument();
      expect(screen.getByText('Per Book')).toBeInTheDocument();
      expect(screen.getByText('$1,559')).toBeInTheDocument();
      expect(screen.getByText('$18,702')).toBeInTheDocument();
    });
  });

  it('shows platform fee for Neural Books', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('$0.65')).toBeInTheDocument();
      expect(screen.getByText('Platform Fee')).toBeInTheDocument();
    });
  });

  it('displays earnings projections chart', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Monthly Earning Projections')).toBeInTheDocument();
      expect(screen.getByText('$519')).toBeInTheDocument();
      expect(screen.getByText('$1,559')).toBeInTheDocument();
      expect(screen.getByText('$4,156')).toBeInTheDocument();
    });
  });

  it('shows blockchain rights indicator for Neural Books', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rights Secured on Blockchain')).toBeInTheDocument();
    });
  });

  it('exports calculation data when export button clicked', async () => {
    global.URL.createObjectURL = jest.fn(() => 'mocked-url');
    global.URL.revokeObjectURL = jest.fn();
    const createElementSpy = jest.spyOn(document, 'createElement');
    const appendChildSpy = jest.spyOn(document.body, 'appendChild');
    const removeChildSpy = jest.spyOn(document.body, 'removeChild');

    renderComponent();

    await waitFor(() => {
      const exportButton = screen.getByText('📤 Export Calculation');
      fireEvent.click(exportButton);
    });

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mocked-url');
  });

  it('handles platform change correctly', async () => {
    renderComponent();

    const platformSelect = screen.getByTestId('platform-select');
    await userEvent.selectOptions(platformSelect, 'KDP');

    expect(platformSelect).toHaveValue('KDP');
  });

  it('validates price input constraints', async () => {
    renderComponent();

    const priceInput = screen.getByTestId('price-input');
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '0.50');

    await waitFor(() => {
      expect(screen.getByText('Price must be at least $0.99')).toBeInTheDocument();
      expect(priceInput).toHaveClass('border-red-500');
    });
  });

  it('validates page count input constraints', async () => {
    renderComponent();

    const pageCountInput = screen.getByTestId('page-count-input');
    await userEvent.clear(pageCountInput);
    await userEvent.type(pageCountInput, '10');

    await waitFor(() => {
      expect(screen.getByText('Page count must be between 50 and 1000')).toBeInTheDocument();
      expect(pageCountInput).toHaveClass('border-red-500');
    });
  });

  it('validates genre input', async () => {
    renderComponent();

    const genreSelect = screen.getByLabelText('Genre');
    await userEvent.selectOptions(genreSelect, '');

    await waitFor(() => {
      expect(screen.getByText('Genre is required')).toBeInTheDocument();
      expect(genreSelect).toHaveClass('border-red-500');
    });
  });

  it('opens and submits Coinbase payout modal', async () => {
    renderComponent();

    await waitFor(() => {
      const coinbaseButton = screen.getByTestId('pay-with-coinbase-btn');
      fireEvent.click(coinbaseButton);
    });

    expect(screen.getByTestId('coinbase-payout-form')).toBeInTheDocument();

    const amountInput = screen.getByTestId('coinbase-amount');
    const descriptionInput = screen.getByTestId('coinbase-description');
    const submitButton = screen.getByTestId('submit-coinbase-payout-btn');

    await userEvent.type(amountInput, '15.00');
    await userEvent.type(descriptionInput, 'Royalty payout');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Coinbase payout initiated')).toBeInTheDocument();
    });
  });

  it('shows error toast for invalid Coinbase amount', async () => {
    renderComponent();

    await waitFor(() => {
      const coinbaseButton = screen.getByTestId('pay-with-coinbase-btn');
      fireEvent.click(coinbaseButton);
    });

    const amountInput = screen.getByTestId('coinbase-amount');
    const submitButton = screen.getByTestId('submit-coinbase-payout-btn');

    await userEvent.type(amountInput, '0');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid amount')).toBeInTheDocument();
    });
  });

  it('opens and submits blockchain payout modal', async () => {
    renderComponent();

    await waitFor(() => {
      const payoutButton = screen.getByTestId('process-payout-btn');
      fireEvent.click(payoutButton);
    });

    expect(screen.getByTestId('payout-modal')).toBeInTheDocument();
  });
});
