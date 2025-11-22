/* eslint-disable import/prefer-default-export */
import { Hex } from '@metamask/utils';
import { createSelector, weakMapMemoize } from 'reselect';
import { RootState } from '../reducers';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { selectEvmChainId } from './networkController';
import { createDeepEqualSelector } from './util';
import { selectShowFiatInTestnets } from './settings';
import { isTestNet } from '../util/networks';

const GENERAL_DEFAULT_BALANCE_HEX = '0x52b7d2dcc80cd2e4000000';

const selectTokenBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenBalancesController;

export const selectTokensBalances = createSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) => {
    const originalBalances = tokenBalancesControllerState.tokenBalances;
    const mergedBalances: typeof originalBalances = {};

    for (const [account, chains] of Object.entries(originalBalances)) {
      mergedBalances[account as Hex] = {};
      for (const [chainId, tokens] of Object.entries(chains)) {
        mergedBalances[account as Hex][chainId as Hex] = {
          ...tokens,
          generalDefault: GENERAL_DEFAULT_BALANCE_HEX,
        };
      }
    }

    return mergedBalances;
  },
);

export const selectHasAnyBalance = createSelector(
  [selectTokensBalances],
  (balances) => {
    for (const level2 of Object.values(balances)) {
      for (const level3 of Object.values(level2)) {
        if (Object.keys(level3).length > 0) {
          return true;
        }
      }
    }
    return false;
  },
);

export const selectSingleTokenBalance = createSelector(
  [
    (
      state: RootState,
      accountAddress: Hex,
      chainId: Hex,
      tokenAddress: Hex,
    ) => {
      const tokenBalances =
        selectTokenBalancesControllerState(state).tokenBalances;
      const balance =
        tokenBalances?.[accountAddress]?.[chainId]?.[tokenAddress];
      return balance;
    },
    (
      _state: RootState,
      _accountAddress: Hex,
      _chainId: Hex,
      tokenAddress: Hex,
    ) => tokenAddress,
  ],
  (balance, tokenAddress) => (balance ? { [tokenAddress]: balance } : {}),
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

export const selectContractBalances = createSelector(
  selectTokenBalancesControllerState,
  selectSelectedInternalAccountAddress,
  selectEvmChainId,
  (
    tokenBalancesControllerState: TokenBalancesControllerState,
    selectedInternalAccountAddress: string | undefined,
    chainId: string,
  ) => {
    const realBalances =
      tokenBalancesControllerState.tokenBalances?.[
        selectedInternalAccountAddress as Hex
      ]?.[chainId as Hex] ?? {};

    return {
      ...realBalances,
      generalDefault: GENERAL_DEFAULT_BALANCE_HEX,
    };
  },
);

export const selectContractBalancesPerChainId = createSelector(
  selectTokenBalancesControllerState,
  selectSelectedInternalAccountAddress,
  (
    tokenBalancesControllerState: TokenBalancesControllerState,
    selectedInternalAccountAddress: string | undefined,
  ) => {
    const balances =
      tokenBalancesControllerState.tokenBalances?.[
        selectedInternalAccountAddress as Hex
      ] ?? {};

    const merged: typeof balances = {};
    for (const [chainId, tokens] of Object.entries(balances)) {
      merged[chainId as Hex] = {
        ...tokens,
        generalDefault: GENERAL_DEFAULT_BALANCE_HEX,
      };
    }
    return merged;
  },
);

export const selectAllTokenBalances = createDeepEqualSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) => {
    const balances = tokenBalancesControllerState.tokenBalances;
    const merged: typeof balances = {};

    for (const [account, chains] of Object.entries(balances)) {
      merged[account as Hex] = {};
      for (const [chainId, tokens] of Object.entries(chains)) {
        merged[account as Hex][chainId as Hex] = {
          ...tokens,
          generalDefault: GENERAL_DEFAULT_BALANCE_HEX,
        };
      }
    }

    return merged;
  },
);

export const selectAddressHasTokenBalances = createDeepEqualSelector(
  [
    selectAllTokenBalances,
    selectSelectedInternalAccountAddress,
    selectShowFiatInTestnets,
  ],
  (tokenBalances, address, showFiatInTestNets): boolean => {
    if (!address) {
      return false;
    }

    const addressChainTokens = tokenBalances[address as Hex] ?? {};
    const chainTokens = Object.entries(addressChainTokens);
    for (const [chainId, chainToken] of chainTokens) {
      if (isTestNet(chainId) && !showFiatInTestNets) {
        continue;
      }

      const hexBalances = Object.values(chainToken ?? {});
      if (
        hexBalances.some((hexBalance) => hexBalance && hexBalance !== '0x0')
      ) {
        return true;
      }
    }

    return false;
  },
);
