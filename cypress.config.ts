import { ChildProcess, spawn } from 'child_process';
import { defineConfig } from 'cypress';
import path from 'path';

let oidcServerProcess: ChildProcess | null = null;

export default defineConfig({
  projectId: 'onnqy3',
  e2e: {
    baseUrl: 'http://localhost:5055',
    video: true,
    setupNodeEvents(on) {
      on('task', {
        startOidcServer() {
          if (oidcServerProcess) return null;
          const serverFile = path.join(
            __dirname,
            'cypress/support/oidc-server.mts'
          );
          oidcServerProcess = spawn('node', [serverFile], {
            stdio: 'inherit',
            detached: false,
          });
          return new Promise((resolve) =>
            setTimeout(() => resolve(null), 2000)
          );
        },
        stopOidcServer() {
          if (oidcServerProcess) {
            oidcServerProcess.kill();
            oidcServerProcess = null;
          }
          return null;
        },
      });
    },
  },
  env: {
    ADMIN_EMAIL: 'admin@seerr.dev',
    ADMIN_PASSWORD: 'test1234',
    USER_EMAIL: 'friend@seerr.dev',
    USER_PASSWORD: 'test1234',
    OIDC_ISSUER_URL: 'http://localhost:8092',
    OIDC_CLIENT_ID: 'jellyseerr-test',
    OIDC_CLIENT_SECRET: 'test-secret',
  },
  retries: {
    runMode: 2,
    openMode: 0,
  },
});
