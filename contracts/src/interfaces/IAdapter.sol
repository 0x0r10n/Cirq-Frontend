// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice The fixed shape every integration adapter (Uniswap, Morpho, Longbow,
/// Loopr) exposes to `CirqAgentPolicy`. Deliberately has no `recipient`
/// parameter distinct from `owner` — funds can only ever move into or out of
/// the calling owner's own account through this interface, which is what lets
/// the policy contract enforce "never withdraw to an arbitrary address"
/// structurally, without having to parse or allowlist arbitrary calldata.
/// See docs/cirq-backend/SECURITY-CAGE.md.
interface IAdapter {
    /// @param owner The Cirq policy owner this action is performed on behalf
    /// of. Every token pulled or paid out settles with this address — an
    /// adapter implementation MUST NOT accept or honor any other
    /// destination.
    /// @param tokenIn Token the owner is spending, or address(0) if the
    /// action doesn't spend a token in (e.g. a pure claim/exit).
    /// @param amountIn Amount of `tokenIn` spent.
    /// @param tokenOut Token the owner receives, or address(0) if none.
    /// @param minAmountOut Slippage/minimum-output bound the adapter must
    /// enforce itself.
    /// @param data Protocol-specific parameters (market id, pool key, loop
    /// template id, etc.) — never an address the funds could be redirected
    /// to.
    /// @return amountOut Amount of `tokenOut` actually received.
    function act(
        address owner,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 minAmountOut,
        bytes calldata data
    ) external returns (uint256 amountOut);
}
