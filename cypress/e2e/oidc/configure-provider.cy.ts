describe('OIDC Provider Configuration', () => {
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
    cy.loginAsAdmin();
    // Clean up any existing test provider and disable OIDC
    cy.deleteOidcProvider(testProvider.slug);
    cy.request({
      method: 'POST',
      url: '/api/v1/settings/main',
      body: { oidcLogin: false },
    });
  });

  it('should open when OIDC enabled', () => {
    cy.visit('/settings/users');

    // Enable OIDC login checkbox
    cy.get('input[name="oidcLogin"]').check();

    // Verify the dialog is open
    cy.contains('OpenID Connect').should('be.visible');
  });

  it('should manually close and open', () => {
    cy.visit('/settings/users');

    // Enable OIDC login checkbox
    cy.get('input[name="oidcLogin"]').check();

    // Verify the dialog is open
    cy.get('[data-testid="settings-oidc"]').should('be.visible');

    // Close the dialog
    cy.contains('Close').click();
    cy.get('[data-testid="settings-oidc"]').should('not.exist');

    cy.get('[data-testid="oidc-settings-button"]');
  });

  it('should add a new OIDC provider', () => {
    cy.visit('/settings/users');

    // Enable OIDC login
    cy.get('input[name="oidcLogin"]').check();

    // Click add provider button
    cy.contains('button', 'Add').click();

    const getModal = () => cy.get('[data-testid="edit-oidc-modal"]');

    // Fill in provider details
    getModal().get('input[name="name"]').type(testProvider.name);
    getModal().get('input[name="issuerUrl"]').type(testProvider.issuerUrl);
    getModal().get('input[name="clientId"]').type(testProvider.clientId);
    getModal()
      .get('input[name="clientSecret"]')
      .type(testProvider.clientSecret);

    // Open Advanced Settings section
    getModal().contains('button', 'Advanced Settings').click();

    // Set slug
    getModal()
      .get('input[name="slug"]')
      .scrollIntoView()
      .clear()
      .type(testProvider.slug);

    // Enable new user login
    getModal()
      .get('input[name="newUserLogin"]')
      .scrollIntoView()
      .check({ force: true });

    // Save the provider
    getModal().contains('button', 'Save Changes').scrollIntoView().click();

    // Verify provider appears in the list
    cy.contains(testProvider.name).should('be.visible');
  });

  it('should edit an existing OIDC provider', () => {
    // First create a provider via API
    cy.configureOidcProvider(testProvider);

    cy.visit('/settings/users');

    // Enable OIDC login
    cy.get('input[name="oidcLogin"]').check();

    // Click on the provider to edit
    cy.contains('li', testProvider.name).contains('button', 'Edit').click();

    const getModal = () => cy.get('[data-testid="edit-oidc-modal"]');

    // Update the name
    const updatedName = 'Updated Test Provider';
    getModal().get('input[name="name"]').clear().type(updatedName);

    // Save changes
    getModal().contains('button', 'Save Changes').click();

    // Verify updated name appears
    cy.contains(updatedName).should('be.visible');
  });

  it('should delete an OIDC provider', () => {
    // First create a provider via API
    cy.configureOidcProvider(testProvider);

    cy.visit('/settings/users');

    // Enable OIDC login
    cy.get('input[name="oidcLogin"]').check();

    // Click on the provider to edit
    cy.contains(testProvider.name).click();

    // Click delete button once to initiate
    cy.contains('button', 'Delete').click();

    // Click "Are you sure?" to confirm deletion
    cy.contains('button', 'Are you sure?').click();

    // Verify provider is removed from the list
    cy.contains(testProvider.name).should('not.exist');
  });
});
