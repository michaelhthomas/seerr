/// <reference types="cypress" />
import 'cy-mobile-commands';

Cypress.Commands.add('login', (email, password) => {
  cy.session(
    [email, password],
    () => {
      cy.visit('/login');

      cy.get('[data-testid=email]').type(email);
      cy.get('[data-testid=password]').type(password);

      cy.intercept('/api/v1/auth/local').as('localLogin');
      cy.get('[data-testid=local-signin-button]').click();

      cy.wait('@localLogin');

      cy.url().should('not.contain', '/login');
    },
    {
      validate() {
        cy.request('/api/v1/auth/me').its('status').should('eq', 200);
      },
    }
  );
});

Cypress.Commands.add('loginAsAdmin', () => {
  cy.login(Cypress.env('ADMIN_EMAIL'), Cypress.env('ADMIN_PASSWORD'));
});

Cypress.Commands.add('loginAsUser', () => {
  cy.login(Cypress.env('USER_EMAIL'), Cypress.env('USER_PASSWORD'));
});

// OIDC Commands

export interface OidcProviderConfig {
  slug: string;
  name: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  newUserLogin?: boolean;
}

Cypress.Commands.add(
  'configureOidcProvider',
  (provider: OidcProviderConfig) => {
    const { slug, ...body } = provider;
    cy.request({
      method: 'PUT',
      url: `/api/v1/settings/oidc/${slug}`,
      body,
    });
  }
);

Cypress.Commands.add('deleteOidcProvider', (slug: string) => {
  cy.request({
    method: 'DELETE',
    url: `/api/v1/settings/oidc/${slug}`,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('enableOidcLogin', () => {
  cy.request({
    method: 'POST',
    url: '/api/v1/settings/main',
    body: { oidcLogin: true, localLogin: true },
  });
});

Cypress.Commands.add(
  'loginWithOidc',
  (providerName: string, sub: string, expectSuccess = true) => {
    cy.visit('/login');
    cy.contains('button', providerName).click();
    cy.origin('http://localhost:8092', { args: { sub } }, ({ sub }) => {
      cy.get('input[name="login"]').type(sub);
      cy.get('input[name="password"]').type('password');
      cy.contains('button', 'Sign-in').click();
      cy.contains('button', 'Continue').click();
    });
    cy.url().should('not.include', 'localhost:8092');
    if (expectSuccess) {
      cy.url({ timeout: 5000 }).should('not.include', '/login');
    }
  }
);

Cypress.Commands.add('linkOidcAccount', (providerName: string, sub: string) => {
  cy.visit('/profile/settings/linked-accounts');
  cy.contains('button', 'Link Account').click();
  cy.contains('a', providerName).click();
  cy.origin('http://localhost:8092', { args: { sub } }, ({ sub }) => {
    cy.get('input[name="login"]').type(sub);
    cy.get('input[name="password"]').type('password');
    cy.contains('button', 'Sign-in').click();
    cy.contains('button', 'Continue').click();
  });
  cy.url().should('include', '/profile/settings/linked-accounts');
});

Cypress.Commands.add('unlinkAllOidcAccounts', (userId: number) => {
  cy.request<{ id: number }[]>({
    method: 'GET',
    url: `/api/v1/user/${userId}/settings/linked-accounts`,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && Array.isArray(response.body)) {
      response.body.forEach((account) => {
        cy.request({
          method: 'DELETE',
          url: `/api/v1/user/${userId}/settings/linked-accounts/${account.id}`,
          failOnStatusCode: false,
        });
      });
    }
  });
});

Cypress.Commands.add('deleteUserByEmail', (email: string) => {
  cy.request<{ results: { id: number; email: string }[] }>({
    method: 'GET',
    url: '/api/v1/user',
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && Array.isArray(response.body.results)) {
      const user = response.body.results.find((u) => u.email === email);
      if (user) {
        cy.request({
          method: 'DELETE',
          url: `/api/v1/user/${user.id}`,
          failOnStatusCode: false,
        });
      }
    }
  });
});
