describe('OIDC New User Login', () => {
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
    // Configure OIDC provider with newUserLogin enabled
    cy.loginAsAdmin();
    cy.configureOidcProvider(testProvider);
    cy.enableOidcLogin();

    // Logout to test new user flow
    cy.request('POST', '/api/v1/auth/logout');
    cy.clearCookies();
    cy.clearAllSessionStorage();
  });

  afterEach(() => {
    // Clean up any users created during tests
    cy.loginAsAdmin();
    cy.deleteUserByEmail('newuser@example.com');
    cy.deleteUserByEmail('bar@example.com');

    // Clear OIDC server session
    cy.clearAllSessionStorage();
  });

  it('should create new user account on first OIDC login', () => {
    cy.loginWithOidc(testProvider.name, 'newuser-sub-789');

    // Verify user is logged in with email from OIDC provider
    cy.request('/api/v1/auth/me').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.email).to.eq('newuser@example.com');
    });
  });

  it('should use OIDC profile information for new user', () => {
    cy.loginWithOidc(testProvider.name, 'bar-sub-456');

    // Verify user info matches OIDC claims
    cy.request('/api/v1/auth/me').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.email).to.eq('bar@example.com');
    });
  });

  it('should deny new user login when newUserLogin is disabled', () => {
    // Reconfigure provider with newUserLogin disabled
    cy.loginAsAdmin();
    cy.configureOidcProvider({
      ...testProvider,
      newUserLogin: false,
    });
    cy.request('POST', '/api/v1/auth/logout');
    cy.clearCookies();

    cy.loginWithOidc(testProvider.name, 'newuser-sub-789', false);

    // Should be redirected back to login with an error
    cy.url().should('include', '/login');

    // Should show an error message
    cy.contains(/do not have permission/i).should('be.visible');
  });

  it('should allow new user to access protected routes after OIDC login', () => {
    cy.loginWithOidc(testProvider.name, 'newuser-sub-789');

    // Access profile page
    cy.visit('/profile');
    cy.request('/api/v1/auth/me').its('status').should('eq', 200);

    // Access profile settings
    cy.visit('/profile/settings');
    cy.request('/api/v1/auth/me').its('status').should('eq', 200);
  });

  it('should show OIDC provider as linked in new user profile', () => {
    cy.loginWithOidc(testProvider.name, 'newuser-sub-789');

    // Navigate to linked accounts settings
    cy.visit('/profile/settings/linked-accounts');

    // The OIDC provider should show as linked
    cy.contains('li', testProvider.name).should('exist');
  });
});
