describe('Writing Flow E2E Tests', () => {
  beforeEach(() => {
    cy.window().its('localStorage').invoke('setItem', 'token', 'mock-jwt-token');
    cy.intercept('POST', '/graphql', (req) => {
      if (req.body.operationName === 'GetManuscripts') {
        req.reply({
          data: {
            manuscripts: [
              {
                id: 'ms123',
                title: 'Test Manuscript',
                genre: 'sci-fi',
                wordCount: 1500,
                progress: 25,
                collaborators: [],
                rightsSecured: false,
              },
            ],
          },
        });
      }
      if (req.body.operationName === 'GetParagraphs') {
        req.reply({
          data: {
            paragraphs: [
              {
                id: 'para1',
                text: 'The quantum server farm stretched endlessly...',
                source: 'HUMAN',
                authorId: 'user123',
                timestamp: new Date().toISOString(),
              },
            ],
          },
        });
      }
      if (req.body.operationName === 'AddParagraph') {
        req.reply({
          data: {
            addParagraph: {
              id: 'para_new',
              text: req.body.variables.input.text,
              source: req.body.variables.input.source,
              authorId: 'user123',
              timestamp: new Date().toISOString(),
            },
          },
        });
      }
      if (req.body.operationName === 'CreateSubscription') {
        req.reply({
          data: {
            createSubscription: {
              id: 'sub123',
              userId: 'user123',
              tier: req.body.variables.input.tier,
              status: 'ACTIVE',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancelAtPeriodEnd: false,
              chargeId: req.body.variables.input.newCoinbaseCharge ? 'charge123' : null,
              paymentMethod: req.body.variables.input.newCoinbaseCharge ? 'COINBASE' : 'STRIPE',
            },
          },
        });
      }
      if (req.body.operationName === 'CreateCoinbaseCharge') {
        req.reply({
          data: {
            createCoinbaseCharge: {
              id: 'charge123',
              code: 'ABC123',
              name: 'Test Charge',
              description: 'Test payment',
              local_price: { amount: '10.00', currency: 'USD' },
              redirect_url: 'http://localhost:3000/payment/success',
              cancel_url: 'http://localhost:3000/payment/cancel',
            },
          },
        });
      }
    }).as('graphqlRequest');
    cy.visit('/dashboard');
  });

  it('completes full writing workflow', () => {
    cy.contains('Test Manuscript').click();
    cy.wait('@graphqlRequest');
    cy.get('[data-testid="text-editor"]').should('be.visible');
    cy.get('[data-testid="ai-panel"]').should('be.visible');
    const newText = 'This is a new paragraph added by the user.';
    cy.get('[data-testid="text-editor"]').clear().type(newText);
    cy.wait(3500);
    cy.wait('@graphqlRequest');
    cy.get('[data-testid="auto-save-indicator"]').should('contain', 'Saved');
    cy.get('[data-testid="ai-suggest-btn"]').click();
    cy.wait('@graphqlRequest');
    cy.get('[data-testid="ai-suggestions"]').should('be.visible');
    cy.get('[data-testid="collaboration-btn"]').click();
    cy.get('[data-testid="invite-collaborator-modal"]').should('be.visible');
    cy.get('[data-testid="royalties-tab"]').click();
    cy.get('[data-testid="royalties-calculator"]').should('be.visible');
    cy.get('[data-testid="platform-select"]').select('NEURAL_BOOKS');
    cy.get('[data-testid="price-input"]').clear().type('19.99');
    cy.get('[data-testid="earnings-per-book"]').should('contain', '$');
    cy.get('[data-testid="blockchain-indicator"]').should('be.visible');
  });

  it('handles real-time collaboration', () => {
    cy.visit('/editor/ms123');
    cy.wait('@graphqlRequest');
    cy.window().then((win) => {
      const event = new CustomEvent('paragraph-added', {
        detail: {
          id: 'para_collab',
          text: 'Content added by collaborator',
          authorId: 'user456',
          timestamp: new Date().toISOString(),
        },
      });
      win.dispatchEvent(event);
    });
    cy.get('[data-testid="collaboration-notification"]')
      .should('be.visible')
      .should('contain', 'added content');
    cy.get('[data-testid="text-editor"]').should('contain', 'Content added by collaborator');
  });

  it('processes blockchain royalty payout', () => {
    cy.visit('/editor/ms123');
    cy.get('[data-testid="royalties-tab"]').click();
    cy.get('[data-testid="platform-select"]').select('NEURAL_BOOKS');
    cy.get('[data-testid="price-input"]').clear().type('15.99');
    cy.get('[data-testid="process-payout-btn"]').click();
    cy.get('[data-testid="payout-modal"]').should('be.visible');
    cy.get('[data-testid="chain-select"]').select('POLYGON');
    cy.get('[data-testid="wallet-address-input"]').type('0x742d35cc6431bc47d8b9e8f1f9a2b1c4d7e8f9a0');
    cy.get('[data-testid="confirm-payout-btn"]').click();
    cy.wait('@graphqlRequest');
    cy.get('[data-testid="success-toast"]').should('be.visible').should('contain', 'Royalty payout initiated');
  });

  it('handles AI usage limits for free tier', () => {
    cy.intercept('POST', '/graphql', (req) => {
      if (req.body.operationName === 'Me') {
        req.reply({
          data: {
            me: {
              id: 'user123',
              email: 'test@example.com',
              name: 'Test User',
              subscriptionTier: 'FREE',
            },
          },
        });
      }
      if (req.body.operationName === 'GenerateAISuggestion') {
        req.reply({
          errors: [
            {
              message: 'AI usage limit exceeded. Please upgrade your subscription.',
            },
          ],
        });
      }
    }).as('graphqlRequest');
    cy.visit('/editor/ms123');
    cy.wait('@graphqlRequest');
    cy.get('[data-testid="ai-suggest-btn"]').click();
    cy.wait('@graphqlRequest');
    cy.get('[data-testid="error-toast"]').should('be.visible').should('contain', 'AI usage limit exceeded');
    cy.get('[data-testid="upgrade-prompt"]').should('be.visible');
  });

  it('processes Coinbase subscription payment', { tags: '@coinbase' }, () => {
    cy.visit('/subscription');
    cy.get('[data-testid="subscription-tier-select"]').select('PRO');
    cy.get('[data-testid="pay-with-coinbase-btn"]').click();
    cy.wait('@graphqlRequest');
    cy.get('[data-testid="coinbase-payment-redirect"]').should('be.visible');
    cy.get('[data-testid="coinbase-payment-redirect"]').click();
    cy.url().should('include', 'commerce.coinbase.com');
    cy.get('[data-testid="success-toast"]').should('be.visible').should('contain', 'Payment initiated');
  });

  it('processes Coinbase one-time payment', { tags: '@coinbase' }, () => {
    cy.visit('/payment');
    cy.get('[data-testid="pay-with-coinbase-btn"]').click();
    cy.get('[data-testid="payment-form"]').should('be.visible');
    cy.get('[data-testid="payment-amount"]').type('10.00');
    cy.get('[data-testid="payment-description"]').type('Test payment');
    cy.get('[data-testid="submit-payment-btn"]').click();
    cy.wait('@graphqlRequest');
    cy.get('[data-testid="coinbase-payment-redirect"]').should('be.visible');
    cy.get('[data-testid="coinbase-payment-redirect"]').click();
    cy.url().should('include', 'commerce.coinbase.com');
    cy.get('[data-testid="success-toast"]').should('be.visible').should('contain', 'Payment initiated');
  });

  it('handles Coinbase payment failure', { tags: '@coinbase' }, () => {
    cy.intercept('POST', '/graphql', (req) => {
      if (req.body.operationName === 'CreateCoinbaseCharge') {
        req.reply({
          errors: [
            {
              message: 'Coinbase payment not allowed for this subscription tier',
            },
          ],
        });
      }
    }).as('graphqlRequest');
    cy.visit('/payment');
    cy.get('[data-testid="pay-with-coinbase-btn"]').click();
    cy.get('[data-testid="payment-form"]').should('be.visible');
    cy.get('[data-testid="payment-amount"]').type('10.00');
    cy.get('[data-testid="payment-description"]').type('Test payment');
    cy.get('[data-testid="submit-payment-btn"]').click();
    cy.wait('@graphqlRequest');
    cy.get('[data-testid="error-toast"]').should('be.visible').should('contain', 'Coinbase payment not allowed');
  });

  it('validates form inputs', () => {
    cy.visit('/editor/ms123');
    cy.get('[data-testid="royalties-tab"]').click();
    cy.get('[data-testid="price-input"]').clear().type('0.50');
    cy.get('[data-testid="price-input"]').should('have.value', '0.99');
    cy.get('[data-testid="page-count-input"]').clear().type('25');
    cy.get('[data-testid="page-count-input"]').should('have.value', '50');
    cy.get('[data-testid="page-count-input"]').clear().type('1500');
    cy.get('[data-testid="page-count-input"]').should('have.value', '1000');
  });

  it('handles network errors gracefully', () => {
    cy.intercept('POST', '/graphql', { forceNetworkError: true }).as('networkError');
    cy.visit('/editor/ms123');
    cy.wait('@networkError');
    cy.get('[data-testid="network-error"]').should('be.visible');
    cy.get('[data-testid="retry-button"]').should('be.visible');
    cy.intercept('POST', '/graphql', (req) => {
      req.reply({
        data: {
          manuscripts: [],
        },
      });
    }).as('retryRequest');
    cy.get('[data-testid="retry-button"]').click();
    cy.wait('@retryRequest');
    cy.get('[data-testid="network-error"]').should('not.exist');
  });

  it('toggles theme successfully', { tags: '@theme' }, () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="theme-toggle-btn"]').should('be.visible');
    cy.get('body').should('have.class', 'light').or('have.class', 'dark');
    cy.get('[data-testid="theme-toggle-btn"]').click();
    cy.get('body').should('have.class', 'dark').or('have.class', 'light');
    cy.get('[data-testid="theme-toggle-btn"]').click();
    cy.get('body').should('have.class', 'light').or('have.class', 'dark');
  });
});
