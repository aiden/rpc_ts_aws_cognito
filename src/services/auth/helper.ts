/**
 * Helper functions to help deal with the authentication context.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as winston from 'winston';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { AuthConfig, BaseUser } from './server_types';

export async function cognitoSignupUser(
  user: BaseUser,
  password: string,
  cognitoClient: CognitoIdentityServiceProvider,
  config: AuthConfig,
) {
  // Sign up the user using Cognito
  await new Promise<void>((resolve, reject) => {
    cognitoClient.signUp(
      {
        ClientId: config.userPoolWebClientId,
        // AWS Cognito username have a special meaning.  A username, contrary to a
        // preferred username, cannot be changed after the user has been created,
        // so it does not make sense to put an email or somebody's name in it,
        // that's why we use a uuid.
        Username: user.id,
        Password: password,
        UserAttributes: [
          // We need to add the email so that users can sign in with their email address.
          { Name: 'email', Value: user.email },
        ],
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          winston.info('NEW USER', data);
          resolve();
        }
      },
    );
  });

  // Confirm sign up ourselves so that the users don't have to validate
  // their email addresses before being able to access our services
  // (they can do it later).
  await new Promise<void>((resolve, reject) => {
    cognitoClient.adminConfirmSignUp(
      {
        UserPoolId: config.userPoolId,
        Username: user.id,
      },
      (err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
}
