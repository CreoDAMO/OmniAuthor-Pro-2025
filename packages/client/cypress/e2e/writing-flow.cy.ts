describe('Writing Flow E2E Tests', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().its('localStorage').invoke('setItem', 'token', 'mock-jwt-token');
    
    // Intercept GraphQL requests
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
    }).as('graphqlRequest');


    cy.visit('/dashboard');
  });


  it('completes full writing workflow', () => {
    // Navigate to editor
    cy.contains('Test Manuscript').click();
    cy.wait('@graphqlRequest');


    // Verify editor loads
    cy.get('[data-testid="text-editor"]').should('be.visible');
    cy.get('[data-testid="ai-panel"]').should('be.visible');


    // Add new content
    const newText = 'This is a new paragraph added by the user.';
    cy.get('[data-testid="text-editor"]')
      .clear()
      .type(newText);


    // Wait for auto-save
    cy.wait(3500); // Auto-save debounce delay
    cy.wait('@graphqlRequest');


    // Verify content was saved
    cy.get('[data-testid="auto-save-indicator"]').should('contain', 'Saved');


    // Test AI suggestions
    cy.get('[data-testid="ai-suggest-btn"]').click();
    cy.wait('@graphqlRequest');


    // Verify AI panel shows suggestions
    cy.get('[data-testid="ai-suggestions"]').should('be.visible');


    // Test collaboration
    cy.get('[data-testid="collaboration-btn"]').click();
    cy.get('[data-testid="invite-collaborator-modal"]').should('be.visible');


    // Test royalties calculator
    cy.get('[data-testid="royalties-tab"]').click();
    cy.get('[data-testid="royalties-calculator"]').should('be.visible');


    // Change platform and verify calculation
    cy.get('[data-testid="platform-select"]').select('NEURAL_BOOKS');
    cy.get('[data-testid="price-input"]').clear().type('19.99');


    // Verify results update
    cy.get('[data-testid="earnings-per-book"]').should('contain', '$');
    cy.get('[data-testid="blockchain-indicator"]').should('be.visible');
  });


  it('handles real-time collaboration', () => {
    cy.visit('/editor/ms123');
    cy.wait('@graphqlRequest');


    // Simulate another user adding content
    cy.window().then((win) => {
      // Trigger subscription update
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


    // Verify notification appears
    cy.get('[data-testid="collaboration-notification"]')
      .should('be.visible')
      .should('contain', 'added content');


    // Verify content is updated
    cy.get('[data-testid="text-editor"]')
      .should('contain', 'Content added by collaborator');
  });


  it('processes blockchain royalty payout', () => {
    cy.visit('/editor/ms123');
    cy.get('[data-testid="royalties-tab"]').click();


    // Set up Neural Books calculation
    cy.get('[data-testid="platform-select"]').select('NEURAL_BOOKS');
    cy.get('[data-testid="price-input"]').clear().type('15.99');


    // Process payout
    cy.get('[data-testid="process-payout-btn"]').click();
    cy.get('[data-testid="payout-modal"]').should('be.visible');


    // Select blockchain
    cy.get('[data-testid="chain-select"]').select('POLYGON');
    cy.get('[data-testid="wallet-address-input"]')
      .type('0x742d35cc6431bc47d8b9e8f1f9a2b1c4d7e8f9a0');


    // Confirm payout
    cy.get('[data-testid="confirm-payout-btn"]').click();
    cy.wait('@graphqlRequest');


    // Verify success message
    cy.get('[data-testid="success-toast"]')
      .should('be.visible')
      .should('contain', 'Royalty payout initiated');
  });


  it('handles AI usage limits for free tier', () => {
    // Mock free tier user
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


    // Try to use AI suggestion
    cy.get('[data-testid="ai-suggest-btn"]').click();
    cy.wait('@graphqlRequest');


    // Verify error message
    cy.get('[data-testid="error-toast"]')
      .should('be.visible')
      .should('contain', 'AI usage limit exceeded');


    // Verify upgrade prompt
    cy.get('[data-testid="upgrade-prompt"]').should('be.visible');
  });


  it('validates form inputs', () => {
    cy.visit('/editor/ms123');
    cy.get('[data-testid="royalties-tab"]').click();


    // Test price validation
    cy.get('[data-testid="price-input"]').clear().type('0.50');
    cy.get('[data-testid="price-input"]').should('have.value', '0.99'); // Min value


    // Test page count validation
    cy.get('[data-testid="page-count-input"]').clear().type('25');
    cy.get('[data-testid="page-count-input"]').should('have.value', '50'); // Min value


    cy.get('[data-testid="page-count-input"]').clear().type('1500');
    cy.get('[data-testid="page-count-input"]').should('have.value', '1000'); // Max value
  });


  it('handles network errors gracefully', () => {
    // Simulate network failure
    cy.intercept('POST', '/graphql', { forceNetworkError: true }).as('networkError');


    cy.visit('/editor/ms123');
    cy.wait('@networkError');


    // Verify error handling
    cy.get('[data-testid="network-error"]').should('be.visible');
    cy.get('[data-testid="retry-button"]').should('be.visible');


    // Test retry functionality
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
});
