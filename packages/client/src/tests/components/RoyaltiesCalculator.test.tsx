import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';


import RoyaltiesCalculator from '../../components/Royalties/RoyaltiesCalculator';
import { CALCULATE_ROYALTIES } from '../../graphql/queries';


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
              conservative: 519.50,
              moderate: 1558.50,
              optimistic: 4156.00,
            },
            annual: {
              conservative: 6234.00,
              moderate: 18702.00,
              optimistic: 49872.00,
            },
          },
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


    expect(screen.getByText('Live Royalties Calculator')).toBeInTheDocument();
    expect(screen.getByLabelText('Platform')).toBeInTheDocument();
    expect(screen.getByLabelText('Format')).toBeInTheDocument();
    expect(screen.getByLabelText('Price ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Page Count')).toBeInTheDocument();
  });


  it('shows Neural Books as recommended platform', () => {
    renderComponent();


    expect(screen.getByText(/Neural Books: 85% royalty/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('NEURAL_BOOKS')).toBeInTheDocument();
  });


  it('calculates royalties when form values change', async () => {
    renderComponent();


    const priceInput = screen.getByLabelText('Price ($)');
    fireEvent.change(priceInput, { target: { value: '15.99' } });


    await waitFor(() => {
      expect(screen.getByText('$10.39')).toBeInTheDocument();
    });


    expect(screen.getByText('Per Book')).toBeInTheDocument();
    expect(screen.getByText('$1,559')).toBeInTheDocument(); // Monthly moderate
    expect(screen.getByText('$18,702')).toBeInTheDocument(); // Annual moderate
  });


  it('shows platform fee for Neural Books', async () => {
    renderComponent();


    await waitFor(() => {
      expect(screen.getByText('$0.65')).toBeInTheDocument();
      expect(screen.getByText('Platform Fee')).toBeInTheDocument();
    });
  });


  it('displays earnings projections range', async () => {
    renderComponent();


    await waitFor(() => {
      expect(screen.getByText('Earning Projections (Monthly)')).toBeInTheDocument();
      expect(screen.getByText('Conservative')).toBeInTheDocument();
      expect(screen.getByText('Moderate')).toBeInTheDocument();
      expect(screen.getByText('Optimistic')).toBeInTheDocument();
    });
  });


  it('shows blockchain rights indicator for Neural Books', async () => {
    renderComponent();


    await waitFor(() => {
      expect(screen.getByText('Rights Secured on Blockchain')).toBeInTheDocument();
    });
  });


  it('exports calculation data when export button clicked', async () => {
    // Mock URL.createObjectURL
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
  });


  it('handles platform change correctly', async () => {
    renderComponent();


    const platformSelect = screen.getByLabelText('Platform');
    fireEvent.change(platformSelect, { target: { value: 'KDP' } });


    expect(platformSelect).toHaveValue('KDP');
  });


  it('validates price input constraints', () => {
    renderComponent();


    const priceInput = screen.getByLabelText('Price ($)') as HTMLInputElement;
    expect(priceInput.min).toBe('0.99');
    expect(priceInput.step).toBe('0.01');
  });


  it('validates page count input constraints', () => {
    renderComponent();


    const pageCountInput = screen.getByLabelText('Page Count') as HTMLInputElement;
    expect(pageCountInput.min).toBe('50');
    expect(pageCountInput.max).toBe('1000');
  });
});
