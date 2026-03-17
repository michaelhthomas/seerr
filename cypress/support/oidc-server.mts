import Provider, {
  type AccountClaims,
  type Configuration,
} from 'oidc-provider';

const PORT = 8092;
const ISSUER = `http://localhost:${PORT}`;

interface UserClaims extends AccountClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  preferred_username: string;
  name: string;
}

// Mock users database
const users: Record<
  string,
  { accountId: string; password: string; claims: UserClaims }
> = {
  'foo-sub-123': {
    accountId: 'foo-sub-123',
    password: 'password',
    claims: {
      sub: 'foo-sub-123',
      email: 'foo@example.com',
      email_verified: true,
      preferred_username: 'foo',
      name: 'Foo User',
    },
  },
  'bar-sub-456': {
    accountId: 'bar-sub-456',
    password: 'password',
    claims: {
      sub: 'bar-sub-456',
      email: 'bar@example.com',
      email_verified: true,
      preferred_username: 'bar',
      name: 'Bar User',
    },
  },
  'newuser-sub-789': {
    accountId: 'newuser-sub-789',
    password: 'password',
    claims: {
      sub: 'newuser-sub-789',
      email: 'newuser@example.com',
      email_verified: true,
      preferred_username: 'newuser',
      name: 'New User',
    },
  },
};

const findAccount: Configuration['findAccount'] = async (_ctx, id) => {
  const account = users[id];
  if (!account) return undefined;

  return {
    accountId: id,
    claims: async () => account.claims,
  };
};

const configuration: Configuration = {
  clients: [
    {
      client_id: 'jellyseerr-test',
      client_secret: 'test-secret',
      grant_types: ['authorization_code', 'refresh_token'],
      redirect_uris: [
        'http://localhost:5055/login',
        'http://localhost:5055/profile/settings/linked-accounts',
      ],
      response_types: ['code'],
      scope: 'openid email profile',
    },
  ],
  findAccount,
  claims: {
    openid: ['sub'],
    email: ['email', 'email_verified'],
    profile: ['name', 'preferred_username'],
  },
  features: {
    devInteractions: { enabled: true },
  },
  cookies: {
    keys: ['test-secret-key'],
  },
  pkce: {
    required: () => false,
  },
  ttl: {
    AccessToken: 3600,
    AuthorizationCode: 600,
    IdToken: 3600,
    RefreshToken: 86400,
  },
};

const provider = new Provider(ISSUER, configuration);

provider.listen(PORT, () => {
  console.log(`Mock OIDC Provider listening on ${ISSUER}`);
  console.log(`Available users: ${Object.keys(users).join(', ')}`);
});
