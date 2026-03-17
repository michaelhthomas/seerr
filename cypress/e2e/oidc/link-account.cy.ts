describe('OIDC Account Linking', () => {
  const testProvider = {
    slug: 'test-provider',
    name: 'Test Provider',
    issuerUrl: Cypress.env('OIDC_ISSUER_URL'),
    clientId: Cypress.env('OIDC_CLIENT_ID'),
    clientSecret: Cypress.env('OIDC_CLIENT_SECRET'),
    newUserLogin: true,
  };

  before(() => {
    cy.task('startOidcServer');
  });

  after(() => {
    cy.task('stopOidcServer');
  });

  beforeEach(() => {
    // Configure OIDC provider via API
    cy.loginAsAdmin();
    cy.configureOidcProvider(testProvider);
    cy.enableOidcLogin();
  });

  afterEach(() => {
    // Clean up any linked accounts
    cy.loginAsAdmin();
    cy.request('/api/v1/auth/me').then((response) => {
      cy.unlinkAllOidcAccounts(response.body.id);
    });
    cy.loginAsUser();
    cy.request('/api/v1/auth/me').then((response) => {
      cy.unlinkAllOidcAccounts(response.body.id);
    });
  });

  it('should display OIDC linking option in profile settings', () => {
    cy.loginAsUser();
    cy.visit('/profile/settings/linked-accounts');

    cy.contains('button', 'Link Account').click();

    // Verify OIDC provider button is visible
    cy.contains('a', testProvider.name).should('be.visible');
  });

  it('should link an OIDC account to existing user', () => {
    cy.loginAsUser();

    // Link OIDC account
    cy.linkOidcAccount(testProvider.name, 'foo-sub-123');

    // Verify we're back on the linked accounts page and account is linked
    cy.url().should('include', '/profile/settings/linked-accounts');
    cy.contains('li', 'Test Provider').contains('foo').should('exist');
  });

  it('should show error when OIDC account is already linked to another user', () => {
    // First, link the account to the regular user
    cy.loginAsUser();
    cy.linkOidcAccount(testProvider.name, 'foo-sub-123');
    cy.request('POST', '/api/v1/auth/logout');
    cy.clearCookies();

    // Now try to link the same OIDC account to admin
    cy.loginAsAdmin();
    cy.visit('/profile/settings/linked-accounts');

    // Try to link with the same OIDC user
    cy.contains('button', 'Link Account').click();
    cy.contains('a', testProvider.name).click();

    cy.origin('http://localhost:8092', () => {
      cy.get('input[name="login"]').type('foo-sub-123');
      cy.get('input[name="password"]').type('password');
      cy.contains('button', 'Sign-in').click();
      cy.contains('button', 'Continue').click();
    });

    // Should be redirected back to linked accounts page with error
    cy.url().should('include', '/profile/settings/linked-accounts');

    // Should show error message
    cy.contains('already linked to another user').should('be.visible');

    // Should still be logged in as admin
    cy.request('/api/v1/auth/me').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.email).to.eq(Cypress.env('ADMIN_EMAIL'));
    });
  });

  it('should unlink an OIDC account', () => {
    cy.loginAsUser();

    // First link an OIDC account
    cy.linkOidcAccount(testProvider.name, 'foo-sub-123');

    // Verify account is linked
    cy.url().should('include', '/profile/settings/linked-accounts');
    cy.contains('li', 'Test Provider').should('exist');

    // Click delete button to initiate unlink
    cy.contains('li', 'Test Provider').contains('button', 'Delete').click();

    // Click "Are you sure?" to confirm
    cy.contains('button', 'Are you sure?').click();

    // Verify account is no longer linked
    cy.contains('li', 'Test Provider').should('not.exist');
  });

  it('should allow re-linking after unlinking an OIDC account', () => {
    cy.loginAsUser();

    // Link an OIDC account
    cy.linkOidcAccount(testProvider.name, 'foo-sub-123');
    cy.contains('li', 'Test Provider').should('exist');

    // Unlink the account
    cy.contains('li', 'Test Provider').contains('button', 'Delete').click();
    cy.contains('button', 'Are you sure?').click();
    cy.contains('li', 'Test Provider').should('not.exist');

    // clear cookies to get a fresh login flow
    cy.clearCookies();
    cy.loginAsUser();

    // Re-link the same OIDC account
    cy.linkOidcAccount(testProvider.name, 'foo-sub-123');

    // Verify account is linked again
    cy.contains('li', 'Test Provider').contains('foo').should('exist');
  });
});
