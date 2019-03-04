/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as t from 'io-ts';
import * as uuid from 'uuid/v1';
import { Users } from '../../services/auth/server_types';
import { ModuleRpcCommon } from 'rpc_ts/lib/common';
import { AuthService } from '../../services/auth/service';
import { throwOnValidationError } from '../../utils/io';
import { ValueError } from '../../utils/errors';
import { ModuleRpcServer } from 'rpc_ts/lib/server';

/** Balance when a user is created (highly unrealistic :) but helps testing) */
const INITIAL_USER_BALANCE = 1000;

export class BankingUsers implements Users<BankingUser, MeInfo> {
  constructor(private readonly users: BankingUser[] = []) {}

  /** @override */
  async create(user: BankingUser) {
    if (await this.findById(user.id)) {
      throw new Error(`user ${user.id} already exists`);
    }
    this.users.push(user);
  }

  /** @override */
  async createFromSignUpRequest(
    request: ModuleRpcCommon.RequestFor<AuthService, 'signUp'>,
  ): Promise<BankingUser> {
    let extra: SignUpExtra;
    try {
      extra = toSignUpExtra(request.extra);
    } catch (err) {
      if (err instanceof ValueError) {
        throw new ModuleRpcServer.ServerRpcError(
          ModuleRpcCommon.RpcErrorType.invalidArgument,
          undefined,
          err.message,
        );
      }
      throw err;
    }
    const user = {
      id: uuid(),
      email: request.email,
      name: extra.displayName,
      balance: INITIAL_USER_BALANCE,
    };
    await this.create(user);
    return user;
  }

  /** @override */
  async update(user: BankingUser) {
    if (!(await this.findById(user.id))) {
      throw new Error(`user ${user.id} does not exist`);
    }
    this.users.splice(this.users.findIndex(u => u.id === user.id), 1);
    this.create(user);
  }

  /** @override */
  async findById(id: string): Promise<BankingUser | undefined> {
    const user = this.users.find(user => user.id === id);
    if (!user) return undefined;
    return { ...user };
  }

  /** @override */
  async findByEmail(email: string): Promise<BankingUser | undefined> {
    const user = this.users.find(user => user.email === email);
    if (!user) return undefined;
    return { ...user };
  }

  /** @override */
  async userToMeInfo(user: BankingUser): Promise<MeInfo> {
    return {
      userId: user.id,
      displayName: user.name,
    };
  }
}

export type BankingUser = {
  id: string;
  email: string;
  name: string;
  balance: number;
};

/** See the README.md for why this I/O boundary is necessary. */
const MeInfo = t.type({
  userId: t.string,
  displayName: t.string,
});

export type MeInfo = t.TypeOf<typeof MeInfo>;

export const toMeInfo = (meInfo: any) => {
  return throwOnValidationError(MeInfo.decode(meInfo));
};

/** See the README.md for why this I/O boundary is necessary. */
const SignUpExtra = t.type({
  displayName: t.string,
});

export type SignUpExtra = t.TypeOf<typeof SignUpExtra>;

export const toSignUpExtra = (extra: any) =>
  throwOnValidationError(SignUpExtra.decode(extra));
