/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />

import type { OidcProviderConfig } from './commands';

declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<Element>;
      loginAsAdmin(): Chainable<Element>;
      loginAsUser(): Chainable<Element>;
      configureOidcProvider(
        provider: OidcProviderConfig
      ): Chainable<Cypress.Response<unknown>>;
      deleteOidcProvider(slug: string): Chainable<Cypress.Response<unknown>>;
      enableOidcLogin(): Chainable<Cypress.Response<unknown>>;
      loginWithOidc(
        providerName: string,
        sub: string,
        expectSuccess?: boolean
      ): Chainable<void>;
      linkOidcAccount(providerName: string, sub: string): Chainable<void>;
      unlinkAllOidcAccounts(userId: number): Chainable<void>;
      deleteUserByEmail(email: string): Chainable<void>;
    }
  }
}

export {};
