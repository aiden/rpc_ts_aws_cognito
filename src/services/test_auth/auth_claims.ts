/**
 * This `AuthClaimsHandler` can be used with the "test" implementation of
 * the `AuthService`, `getTestAuthHandler`.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ModuleRpcServer } from 'rpc_ts/lib/server';
import { ModuleRpcCommon } from 'rpc_ts/lib/common';
import { BaseUser, Users } from '../auth/server_types';
import { AuthClaims } from '../auth/auth_claims';

export const getTestAuthClaimsHandler = <User extends BaseUser, MeInfo>(
  users: Users<User, MeInfo>,
) => async (token: string): Promise<AuthClaims> => {
  const userId = token;
  if (!users.findById(userId)) {
    throw new ModuleRpcServer.ServerRpcError(
      ModuleRpcCommon.RpcErrorType.unauthenticated,
      `expected user ${userId} to exist`,
    );
  }
  return {
    userId,
  };
};
