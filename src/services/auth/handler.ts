/**
 * @module
 *
 * Authentication is implemented using AWS Cognito.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as winston from 'winston';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import * as moment from 'moment';
import { AuthService, AwsTokenInfo } from './service';
import { ModuleRpcServer } from 'rpc_ts/lib/server';
import { cognitoSignupUser } from './helper';
import { ModuleRpcCommon } from 'rpc_ts/lib/common';
import { RFC3339, toRFC3339 } from '../../utils/rfc3339';
import { ValueError } from 'rpc_ts_chat/src/utils/errors';
import { AuthConfig, BaseUser, Users } from './server_types';

export type AuthHandler = ModuleRpcServer.ServiceHandlerFor<AuthService>;

export const getAuthHandler = <User extends BaseUser, MeInfo>(
  config: AuthConfig,
  users: Users<User, MeInfo>,
): AuthHandler => {
  const cognitoClient = new CognitoIdentityServiceProvider({
    region: config.region,
    credentials: config.credentials,
  });
  return {
    async signIn(request) {
      // https://forums.aws.amazon.com/thread.jspa?threadID=243352: Not possible currently
      // to use email with adminInitiateAuth instead of username...
      const user = await users.findByEmail(request.email);
      if (!user) {
        winston.warn(`no user with email ${request.email}`);
        return {
          status: 'failure',
        };
      }

      const awsTokenInfoWithOptionalRefreshToken = await adminInitiateAuth(
        config,
        cognitoClient,
        'ADMIN_NO_SRP_AUTH',
        {
          USERNAME: user.id,
          PASSWORD: request.password,
          // TODO: use `userPoolWebClientSecretHash` once the AWS team has properly implemented it.
          // SECRET_HASH: config.userPoolWebClientSecretHash,
        },
      );
      if (!awsTokenInfoWithOptionalRefreshToken) {
        return {
          status: 'failure',
        };
      }
      if (!awsTokenInfoWithOptionalRefreshToken.refreshToken) {
        throw new Error(
          'expected a refreshToken from adminInitiateAuth in signIn',
        );
      }

      return {
        status: 'success',
        tokenInfo: awsTokenInfoWithOptionalRefreshToken as AwsTokenInfo,
        me: await users.userToMeInfo(user),
      };
    },
    async signUp(request) {
      const user = await users.createFromSignUpRequest(request);
      await cognitoSignupUser(user, request.password, cognitoClient, config);

      return { userId: user.id };
    },
    async refreshToken(request) {
      const awsTokenInfoWithOptionalRefreshToken = await adminInitiateAuth(
        config,
        cognitoClient,
        'REFRESH_TOKEN_AUTH',
        {
          REFRESH_TOKEN: request.refreshToken,
          SECRET_HASH: config.userPoolWebClientSecretHash,
        },
      );
      if (!awsTokenInfoWithOptionalRefreshToken) {
        throw new ModuleRpcServer.ServerRpcError(
          ModuleRpcCommon.RpcErrorType.unauthenticated,
          'cannot refresh token',
        );
      }
      if (awsTokenInfoWithOptionalRefreshToken.refreshToken) {
        throw new Error(
          'unexpected refreshToken from adminInitiateAuth on refresh',
        );
      }
      return {
        ...awsTokenInfoWithOptionalRefreshToken,
        refreshToken: request.refreshToken,
      };
    },
  };
};

async function adminInitiateAuth(
  config: AuthConfig,
  cognitoClient: CognitoIdentityServiceProvider,
  authFlow: string,
  authParameters: CognitoIdentityServiceProvider.AuthParametersType,
): Promise<AwsTokenInfoWithOptionalRefreshToken | null> {
  return new Promise<AwsTokenInfoWithOptionalRefreshToken | null>(
    (accept, reject) => {
      cognitoClient.adminInitiateAuth(
        {
          UserPoolId: config.userPoolId,
          ClientId: config.userPoolWebClientId,
          AuthFlow: authFlow,
          AuthParameters: authParameters,
        },
        (err, data) => {
          if (err) {
            if (
              err.code === 'NotAuthorizedException' ||
              err.code === 'UserNotFoundException'
            ) {
              // Cannot authenticate user
              winston.warn(`Cannot authenticate user: ${err.message}`);
              accept(null);
            } else if (err.code === 'ExpiredTokenException') {
              reject(
                new ModuleRpcServer.ServerRpcError(
                  ModuleRpcCommon.RpcErrorType.internal,
                  `The web identity token that was passed is expired or is not valid. ` +
                    `Get a new identity token from the identity provider and then retry the request.`,
                ),
              );
            } else if (err.code === 'FetchError') {
              reject(
                new ModuleRpcServer.ServerRpcError(
                  ModuleRpcCommon.RpcErrorType.unavailable,
                  `AWS Cognito is not available: ${err.stack}`,
                ),
              );
            } else {
              reject(err);
            }
          } else if (data.ChallengeName) {
            reject(
              new ModuleRpcServer.ServerRpcError(
                ModuleRpcCommon.RpcErrorType.internal,
                `authentication challenge ${
                  data.ChallengeName
                } is not implemented`,
              ),
            );
          } else {
            accept(
              convertCognitoAuthenticationResult(data.AuthenticationResult!),
            );
          }
        },
      );
    },
  );
}

/**
 * The Cognito authentication result lack a refresh token when we use a refresh
 * token to re-authenticate (in this case, the original refresh token must be re-used).
 * Therefore, to capture this in TypeScript, we have this type alongside AwsTokenInfo.
 */
type AwsTokenInfoWithOptionalRefreshToken = {
  awsAccessToken: string;
  token: string;
  expiryDate: string;
  refreshToken: string | undefined;
};

/** Convert an AWS Cognito authentication result to our own API types. */
function convertCognitoAuthenticationResult(
  result: CognitoIdentityServiceProvider.AuthenticationResultType,
): AwsTokenInfoWithOptionalRefreshToken {
  if (result.TokenType !== 'Bearer') {
    throw new ModuleRpcServer.ServerRpcError(
      ModuleRpcCommon.RpcErrorType.internal,
      `expected a bearer token; got token type: ${result.TokenType}`,
    );
  }

  // All the fields in AuthenticationResultType are marked as optional but
  // we require some of them
  for (const fieldName of ['AccessToken', 'ExpiresIn', 'IdToken'] as Array<
    keyof CognitoIdentityServiceProvider.AuthenticationResultType
  >) {
    if (!result[fieldName]) {
      throw new Error(`AuthenticationResultType.${fieldName} was expected`);
    }
  }

  // We check the expiry date for extra defensiveness
  let expiryDate: RFC3339;
  try {
    expiryDate = toRFC3339(moment().add(result.ExpiresIn, 'seconds'));
  } catch (err) {
    if (err instanceof ValueError) {
      throw new Error(
        `AuthenticationResultType.ExpiresIn is not a valid RFC3339 date: '${
          result.ExpiresIn
        }'`,
      );
    }
    throw err;
  }

  return {
    awsAccessToken: result.AccessToken!,
    token: result.IdToken!,
    expiryDate,
    refreshToken: result.RefreshToken,
  };
}
