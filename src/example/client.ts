/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ModuleRpcProtocolClient } from 'rpc_ts/lib/protocol/client';
import { ModuleRpcContextClient } from 'rpc_ts/lib/context/client';
import { authServiceDefinition, AuthService } from '../services/auth/service';
import { ModuleRpcClient } from 'rpc_ts/lib/client';
import {
  BankingService,
  bankingServiceDefinition,
} from './services/banking/service';
import { ROUTES } from './routing';
import { ModuleRpcCommon } from 'rpc_ts/lib/common';
import { SignUpExtra, MeInfo, toMeInfo } from './models/users';

/**
 * Client to interact with all the services.
 */
export class Client {
  /**
   * The auth service is not directly exposed because (1) we wrap sign in to
   * provide authentication for the other services, and (2) we provide strong typing
   * where TypeScript fails us (for `SignUpExtra` and `MeInfo`, see `README.md`).
   */
  private readonly auth: ModuleRpcClient.ServiceMethodMap<AuthService>;

  public readonly banking: ModuleRpcClient.ServiceMethodMap<BankingService>;

  private readonly authClientContextConnector: ModuleRpcContextClient.TokenAuthClientContextConnector;
  private me_: MeInfo | undefined;

  /**
   * @param serverUrl Base URL for the server
   * @param refreshTokenExpiryDateOffsetMs By default, refresh the auth token around
   * 10 min before it actually expires (tokens expires
   * in about an hour after they are created).  If you want to test the
   * refresh behavior, just set this one to a very, very large number to
   * trigger a fresh on each API call (basically the token will always
   * be considered stale).
   */
  constructor(
    serverUrl: string,
    refreshTokenExpiryDateOffsetMs: number = 10 * 60 * 1000,
  ) {
    this.auth = ModuleRpcProtocolClient.getRpcClient(authServiceDefinition, {
      remoteAddress: `${serverUrl}${ROUTES.auth}`,
    });

    this.authClientContextConnector = new ModuleRpcContextClient.TokenAuthClientContextConnector(
      async (refreshToken: string) => {
        return this.auth.refreshToken({
          refreshToken,
        });
      },
      refreshTokenExpiryDateOffsetMs,
    );

    this.banking = ModuleRpcProtocolClient.getRpcClient(
      bankingServiceDefinition,
      {
        remoteAddress: `${serverUrl}${ROUTES.banking}`,
        clientContextConnector: this.authClientContextConnector,
      },
    );
  }

  async signUp(
    request: ModuleRpcCommon.RequestFor<AuthService, 'signUp'> & {
      extra: SignUpExtra;
    },
  ): Promise<ModuleRpcCommon.ResponseFor<AuthService, 'signUp'>> {
    return this.auth.signUp(request);
  }

  async signIn(
    request: ModuleRpcCommon.RequestFor<AuthService, 'signIn'>,
  ): Promise<void> {
    const response = await this.auth.signIn(request);
    if (response.status === 'failure') {
      throw new Error('cannot authenticate');
    }
    this.authClientContextConnector.authenticate(response.tokenInfo);
    this.me_ = toMeInfo(response.me);
  }

  get me(): MeInfo {
    if (!this.me_) {
      throw new Error('not authenticated');
    }
    return this.me_;
  }
}
