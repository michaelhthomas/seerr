describe('OIDC Login with Existing User', () => {
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

    // Link OIDC account to existing user
    cy.loginAsUser();
    cy.linkOidcAccount(testProvider.name, 'foo-sub-123');

    // Logout to test login flow
    cy.request('POST', '/api/v1/auth/logout');
    cy.clearCookies();
    cy.clearAllSessionStorage();
  });

  afterEach(() => {
    // Clean up linked accounts
    cy.loginAsUser();
    cy.request('/api/v1/auth/me').then((response) => {
      cy.unlinkAllOidcAccounts(response.body.id);
    });

    // Clear OIDC server session
    cy.clearAllSessionStorage();
  });

  it('should display OIDC login button on login page', () => {
    cy.visit('/login');

    // Verify OIDC provider button is visible
    cy.get(`[data-testid="oidc-login-${testProvider.slug}"]`).should(
      'be.visible'
    );
    cy.contains('button', testProvider.name).should('be.visible');
  });

  it('should login with linked OIDC account', () => {
    cy.visit('/login');

    // Click OIDC login button
    cy.get(`[data-testid="oidc-login-${testProvider.slug}"]`).click();

    // Handle OIDC provider login
    cy.origin('http://localhost:8092', () => {
      cy.get('input[name="login"]').type('foo-sub-123');
      cy.get('input[name="password"]').type('password');
      cy.contains('button', 'Sign-in').click();
      cy.contains('button', 'Continue').click();
    });

    // Verify successful login - should be redirected to home
    cy.url().should('not.include', 'localhost:8092');
    cy.url().should('not.include', '/login');

    // Verify user is logged in
    cy.request('/api/v1/auth/me').its('status').should('eq', 200);
  });

  it('should maintain session after OIDC login', () => {
    cy.visit('/login');

    // Login with OIDC
    cy.get(`[data-testid="oidc-login-${testProvider.slug}"]`).click();

    cy.origin('http://localhost:8092', () => {
      cy.get('input[name="login"]').type('foo-sub-123');
      cy.get('input[name="password"]').type('password');
      cy.contains('button', 'Sign-in').click();
      cy.contains('button', 'Continue').click();
    });

    // Wait for redirect to complete
    cy.url().should('not.include', '/login');

    // Navigate to different pages and verify session persists
    cy.visit('/profile');
    cy.request('/api/v1/auth/me').its('status').should('eq', 200);

    cy.visit('/');
    cy.request('/api/v1/auth/me').its('status').should('eq', 200);
  });

  it('should redirect to original page after OIDC login', () => {
    // Try to access a protected page while logged out
    cy.visit('/profile/settings');

    // Should be redirected to login
    cy.url().should('include', '/login');

    // Login with OIDC
    cy.get(`[data-testid="oidc-login-${testProvider.slug}"]`).click();

    cy.origin('http://localhost:8092', () => {
      cy.get('input[name="login"]').type('foo-sub-123');
      cy.get('input[name="password"]').type('password');
      cy.contains('button', 'Sign-in').click();
      cy.contains('button', 'Continue').click();
    });

    // Should be redirected back to the original page after login
    cy.url().should('not.include', '/login');
  });

  it('should allow logout after OIDC login', () => {
    // Login with OIDC
    cy.loginWithOidc(testProvider.name, 'foo-sub-123');

    // Verify logged in
    cy.request('/api/v1/auth/me').its('status').should('eq', 200);

    // Logout
    cy.request('POST', '/api/v1/auth/logout');

    // Verify logged out
    cy.request({
      url: '/api/v1/auth/me',
      failOnStatusCode: false,
    })
      .its('status')
      .should('eq', 403);
  });
});
