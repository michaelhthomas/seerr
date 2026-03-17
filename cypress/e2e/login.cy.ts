import { MediaServerType } from '../../server/constants/server';

describe('Login', () => {
  it('succesfully logs in as an admin', () => {
    cy.loginAsAdmin();
    cy.visit('/');
    cy.contains('Trending');
  });

  it('succesfully logs in as a local user', () => {
    cy.loginAsUser();
    cy.visit('/');
    cy.contains('Trending');
  });
});

/**
 * Generates all permutations of boolean values of the given length.
 * @param n Length
 */
function permutations(n: number): boolean[][] {
  return Array.from({ length: 1 << n }, (_, i) =>
    Array.from({ length: n }, (_, j) => !!(i & (1 << (n - 1 - j))))
  );
}

describe('Login Page', () => {
  const testProvider = {
    slug: 'test-provider',
    name: 'Test Provider',
    issuerUrl: Cypress.env('OIDC_ISSUER_URL'),
    clientId: Cypress.env('OIDC_CLIENT_ID'),
    clientSecret: Cypress.env('OIDC_CLIENT_SECRET'),
    newUserLogin: true,
  };

  const LOCAL_LOGIN_SELECTOR = '[data-testid^="seerr-login"]';
  const PLEX_LOGIN_SELECTOR = '[data-testid="plex-login-button"]';
  const MEDIA_SERVER_LOGIN_SELECTOR = '[data-testid^="mediaserver-login"]';
  const OIDC_LOGIN_SELECTOR = `[data-testid="oidc-login-${testProvider.slug}"]`;

  before(() => {
    cy.loginAsAdmin();
    // Configure an OIDC Provider to show on the login screen
    cy.request({
      method: 'POST',
      url: '/api/v1/settings/main',
      body: {
        oidcLogin: true,
      },
    });
    cy.configureOidcProvider(testProvider);
  });

  after(() => {
    cy.loginAsAdmin();
    // Reset settings to defaults
    cy.request({
      method: 'POST',
      url: '/api/v1/settings/main',
      body: {
        localLogin: true,
        mediaServerLogin: true,
        oidcLogin: false,
        mediaServerType: MediaServerType.PLEX,
      },
    });
    // Remove created OIDC provider
    cy.request({
      method: 'DELETE',
      url: `/api/v1/settings/oidc/${testProvider.slug}`,
    });
  });

  for (const [
    localLogin,
    mediaServerLogin,
    oidcLogin,
    enablePlex,
  ] of permutations(4)) {
    if (!localLogin && !mediaServerLogin && !oidcLogin) continue;

    const enabledFlags = Object.entries({
      localLogin,
      mediaServerLogin,
      oidcLogin,
    })
      .filter(([_, v]) => v)
      .map(([k, _]) => k)
      .concat(enablePlex ? 'plex' : 'jellyfin')
      .join(', ');

    it(`correct items are shown (${enabledFlags})`, () => {
      cy.loginAsAdmin();
      // set settings
      cy.request({
        method: 'POST',
        url: '/api/v1/settings/main',
        body: {
          localLogin,
          mediaServerLogin,
          oidcLogin,
          mediaServerType: enablePlex
            ? MediaServerType.PLEX
            : MediaServerType.JELLYFIN,
        },
      });
      cy.then(Cypress.session.clearCurrentSessionData);

      cy.visit('/login');

      // Ensure the right things are visible
      cy.get(LOCAL_LOGIN_SELECTOR).should(localLogin ? 'exist' : 'not.exist');
      cy.get(MEDIA_SERVER_LOGIN_SELECTOR).should(
        mediaServerLogin && !enablePlex ? 'exist' : 'not.exist'
      );
      cy.get(PLEX_LOGIN_SELECTOR).should(
        mediaServerLogin && enablePlex ? 'exist' : 'not.exist'
      );
      cy.get(OIDC_LOGIN_SELECTOR).should(oidcLogin ? 'exist' : 'not.exist');
    });
  }
});
