// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {CirqRegistry} from "./CirqRegistry.sol";
import {IAdapter} from "./interfaces/IAdapter.sol";

/// @notice The ERC-7715 session-key policy cage. Threat model: the session
/// key is fully compromised. This contract's job is to make that survivable
/// — see docs/cirq-backend/SECURITY-CAGE.md for the full invariant list this
/// is tested against.
///
/// Design choice recorded here (see docs/cirq-backend/DECISIONS.md for the
/// open items this still leaves): every action routes through
/// `IAdapter.act`, whose signature has no destination argument distinct from
/// `owner` — so "never withdraw to an arbitrary address" holds structurally,
/// not by trying to allowlist or parse arbitrary calldata per adapter.
contract CirqAgentPolicy {
    struct PolicyConfig {
        uint256 perTradeCap;
        uint256 dailyCap;
        uint64 windowStart;
        uint64 windowEnd;
    }

    CirqRegistry public immutable registry;

    mapping(address owner => PolicyConfig) public policyConfig;
    mapping(address owner => mapping(address token => bool)) public tokenWhitelist;
    /// @notice Bumped by `revoke()`. A session key is only valid while its
    /// `sessionKeyEpoch` still equals its owner's current `epoch` — checked
    /// at every `execute()` call, never only at grant time, which is what
    /// makes revoke instant even for an in-flight call.
    mapping(address owner => uint256) public epoch;
    mapping(address sessionKey => address owner) public sessionKeyOwner;
    mapping(address sessionKey => uint256 epochAtGrant) public sessionKeyEpoch;
    mapping(address owner => mapping(uint256 day => uint256 spent)) public dailySpent;

    event SessionKeyGranted(
        address indexed owner, address indexed sessionKey, uint256 epoch
    );
    event Revoked(address indexed owner, uint256 newEpoch);
    event Executed(
        address indexed owner,
        address indexed sessionKey,
        address indexed adapter,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut
    );

    error RegistryPaused();
    error NotSessionKeyOwner();
    error SessionKeyRevoked();
    error AdapterNotAllowlisted();
    error TokenNotWhitelisted();
    error OutsideTradingWindow();
    error PerTradeCapExceeded();
    error DailyCapExceeded();
    error InvalidWindow();

    constructor(CirqRegistry registry_) {
        registry = registry_;
    }

    modifier whenRegistryNotPaused() {
        if (registry.paused()) revert RegistryPaused();
        _;
    }

    /// @notice Owner-only. Grants or replaces a session key's policy. Callable
    /// by the owner directly — never by the session key itself, and never by
    /// anything the agent controls.
    function grantSessionKey(
        address sessionKey,
        address[] calldata whitelistedTokens,
        uint256 perTradeCap,
        uint256 dailyCap,
        uint64 windowStart,
        uint64 windowEnd
    ) external {
        if (windowEnd <= windowStart) revert InvalidWindow();

        address owner = msg.sender;
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            tokenWhitelist[owner][whitelistedTokens[i]] = true;
        }
        policyConfig[owner] =
            PolicyConfig({perTradeCap: perTradeCap, dailyCap: dailyCap, windowStart: windowStart, windowEnd: windowEnd});

        sessionKeyOwner[sessionKey] = owner;
        sessionKeyEpoch[sessionKey] = epoch[owner];

        emit SessionKeyGranted(owner, sessionKey, epoch[owner]);
    }

    /// @notice Owner-only. Bumps the owner's epoch, instantly invalidating
    /// every session key granted under the previous epoch — no enumeration
    /// or explicit per-key revocation needed.
    function revoke() external {
        uint256 newEpoch = ++epoch[msg.sender];
        emit Revoked(msg.sender, newEpoch);
    }

    /// @notice Called by a session key (never by the owner directly, though
    /// nothing stops it — the owner already has unrestricted control of
    /// their own account outside this contract). Enforces, in order: caller
    /// is a live (non-revoked) session key, the adapter is allow-listed, both
    /// tokens are whitelisted for this owner, the call is inside the trading
    /// window, and both caps hold — then forwards to the adapter, which can
    /// only ever move funds to/from `owner`.
    function execute(
        address adapter,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 minAmountOut,
        bytes calldata data
    ) external whenRegistryNotPaused returns (uint256 amountOut) {
        address sessionKey = msg.sender;
        address owner = sessionKeyOwner[sessionKey];
        if (owner == address(0)) revert NotSessionKeyOwner();
        if (sessionKeyEpoch[sessionKey] != epoch[owner]) revert SessionKeyRevoked();
        if (!registry.isAdapterAllowed(adapter)) revert AdapterNotAllowlisted();
        // Belt and suspenders: a token must be both globally curated
        // (CirqRegistry) and specifically authorized by this owner
        // (tokenWhitelist) — either list alone being wrong is not enough to
        // let a bad token through.
        if (
            tokenIn != address(0)
                && (!tokenWhitelist[owner][tokenIn] || !registry.isTokenAllowed(tokenIn))
        ) {
            revert TokenNotWhitelisted();
        }
        if (
            tokenOut != address(0)
                && (!tokenWhitelist[owner][tokenOut] || !registry.isTokenAllowed(tokenOut))
        ) {
            revert TokenNotWhitelisted();
        }

        PolicyConfig memory cfg = policyConfig[owner];
        if (block.timestamp < cfg.windowStart || block.timestamp > cfg.windowEnd) {
            revert OutsideTradingWindow();
        }
        if (amountIn > cfg.perTradeCap) revert PerTradeCapExceeded();

        uint256 day = block.timestamp / 1 days;
        uint256 spentSoFar = dailySpent[owner][day];
        if (spentSoFar + amountIn > cfg.dailyCap) revert DailyCapExceeded();
        dailySpent[owner][day] = spentSoFar + amountIn;

        amountOut = IAdapter(adapter).act(owner, tokenIn, amountIn, tokenOut, minAmountOut, data);

        emit Executed(owner, sessionKey, adapter, tokenIn, amountIn, tokenOut, amountOut);
    }
}
