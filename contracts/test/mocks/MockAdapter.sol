// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IAdapter} from "../../src/interfaces/IAdapter.sol";

/// @notice Records every call it receives; pretends every swap fills exactly
/// at `minAmountOut`. Used to test `CirqAgentPolicy` in isolation from any
/// real protocol integration.
contract MockAdapter is IAdapter {
    uint256 public callCount;
    address public lastOwner;
    address public lastTokenIn;
    uint256 public lastAmountIn;
    address public lastTokenOut;

    function act(
        address owner,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 minAmountOut,
        bytes calldata /* data */
    ) external returns (uint256 amountOut) {
        callCount++;
        lastOwner = owner;
        lastTokenIn = tokenIn;
        lastAmountIn = amountIn;
        lastTokenOut = tokenOut;
        amountOut = minAmountOut;
    }
}
