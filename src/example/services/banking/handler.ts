/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ModuleRpcServer } from 'rpc_ts/lib/server';
import { BankingService } from './service';
import { ModuleRpcContextCommon } from 'rpc_ts/lib/context/common';
import { AuthClaims } from '../../../services/auth/auth_claims';
import { ModuleRpcCommon } from 'rpc_ts/lib/common';
import { BankingUsers } from '../../models/users';

export type BankingHandler = ModuleRpcServer.ServiceHandlerFor<
  BankingService,
  ModuleRpcContextCommon.TokenAuthRequestContext<AuthClaims>
>;

/**
 * Return a handler where the methods of the BankingService are actually implemented.
 *
 * We wrap it in a function to allow for closures, so that you can have variables scoped
 * to the lifetime of the server (such as the mock store `users` in this instance).
 */
export const getBankingHandler = (users: BankingUsers): BankingHandler => {
  return {
    async getBalance(_, { authClaims: { userId } }) {
      const user = await users.findById(userId);
      /* istanbul ignore if */
      if (!user) {
        // It is possible to throw a `ModuleRpcServer.ServerRpcError` to give more
        // info to the client concerning why the request fail.  If any other kind
        // of error is thrown, it is interpreted as an internal error.
        throw new ModuleRpcServer.ServerRpcError(
          ModuleRpcCommon.RpcErrorType.notFound,
          `user ${userId} not found`,
        );
      }
      return { value: user.balance };
    },
    async transfer(request, { authClaims: { userId } }) {
      const fromUser = await users.findById(userId);
      /* istanbul ignore if */
      if (!fromUser) {
        // The third parameter of ModuleRpcServer.ServerRpcError is an optional
        // message sent to the client along with the error type, to give more context.
        // This is potentially unsafe, as this kind of information can be exploited
        // by malicious clients, so by default nothing is sent.
        throw new ModuleRpcServer.ServerRpcError(
          // This is an internal error because should be prevented by proper authentication
          ModuleRpcCommon.RpcErrorType.internal,
          `'from' user not found`,
        );
      }
      const toUser = await users.findById(request.toUserId);
      /* istanbul ignore if */
      if (!toUser) {
        throw new ModuleRpcServer.ServerRpcError(
          ModuleRpcCommon.RpcErrorType.notFound,
          undefined,
          `'to' user not found`,
        );
      }
      /* istanbul ignore if */
      if (fromUser.balance < request.amount) {
        throw new ModuleRpcServer.ServerRpcError(
          ModuleRpcCommon.RpcErrorType.failedPrecondition,
          undefined,
          `'from' user has insufficient funds`,
        );
      }
      fromUser.balance -= request.amount;
      toUser.balance += request.amount;
      await users.update(fromUser);
      await users.update(toUser);
      return {};
    },
  };
};
