import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID ?? '',
  ClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID ?? '',
});

let pendingUser: CognitoUser | null = null;

export interface AuthResult {
  token: string;
  email: string;
}

export interface ChallengeResult {
  challenge: 'NEW_PASSWORD_REQUIRED';
}

export function signIn(
  email: string,
  password: string,
): Promise<AuthResult | ChallengeResult> {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  const details = new AuthenticationDetails({ Username: email, Password: password });

  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess(session: CognitoUserSession) {
        resolve({
          token: session.getIdToken().getJwtToken(),
          email,
        });
      },
      onFailure(err: Error) {
        reject(err);
      },
      newPasswordRequired() {
        pendingUser = user;
        resolve({ challenge: 'NEW_PASSWORD_REQUIRED' });
      },
    });
  });
}

export function completeNewPassword(newPassword: string): Promise<AuthResult> {
  if (!pendingUser) throw new Error('No pending challenge');
  const user = pendingUser;

  return new Promise((resolve, reject) => {
    user.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess(session: CognitoUserSession) {
        pendingUser = null;
        resolve({
          token: session.getIdToken().getJwtToken(),
          email: user.getUsername(),
        });
      },
      onFailure(err: Error) {
        reject(err);
      },
    });
  });
}

export function signOut(): void {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}

export function getCurrentToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) return resolve(null);

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export function getCurrentEmail(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) return resolve(null);

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);
      const payload = session.getIdToken().decodePayload();
      resolve((payload['email'] as string) ?? user.getUsername());
    });
  });
}
