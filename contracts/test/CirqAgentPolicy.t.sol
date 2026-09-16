// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {CirqRegistry} from "../src/CirqRegistry.sol";
import {CirqAgentPolicy} from "../src/CirqAgentPolicy.sol";
import {MockAdapter} from "./mocks/MockAdapter.sol";

/// @notice Asserts every invariant in docs/cirq-backend/SECURITY-CAGE.md.
/// Threat model throughout: `sessionKey` is fully compromised — every
/// adversarial test calls `execute` directly as `sessionKey`, exactly as an
/// attacker who has fully extracted the key would.
contract CirqAgentPolicyTest is Test {
    CirqRegistry internal registry;
    CirqAgentPolicy internal policy;
    MockAdapter internal adapter;
    MockAdapter internal unlistedAdapter;

    address internal admin = makeAddr("admin");
    address internal user = makeAddr("user");
    address internal attackerOwner = makeAddr("attackerOwner");
    address internal sessionKey = makeAddr("sessionKey");
    address internal attackerSessionKey = makeAddr("attackerSessionKey");

    address internal tokenA = makeAddr("tokenA");
    address internal tokenB = makeAddr("tokenB");
    address internal tokenNotWhitelisted = makeAddr("tokenNotWhitelisted");

    uint256 internal constant PER_TRADE_CAP = 100 ether;
    uint256 internal constant DAILY_CAP = 150 ether;
    uint64 internal windowStart;
    uint64 internal windowEnd;

    function setUp() public {
        vm.warp(1_000_000);
        windowStart = uint64(block.timestamp);
        windowEnd = uint64(block.timestamp + 1 days);

        registry = new CirqRegistry(admin);
        policy = new CirqAgentPolicy(registry);
        adapter = new MockAdapter();
        unlistedAdapter = new MockAdapter();

        vm.startPrank(admin);
        registry.setTokenAllowed(tokenA, true);
        registry.setTokenAllowed(tokenB, true);
        registry.setAdapterAllowed(address(adapter), true);
        vm.stopPrank();

        address[] memory tokens = new address[](2);
        tokens[0] = tokenA;
        tokens[1] = tokenB;

        vm.prank(user);
        policy.grantSessionKey(sessionKey, tokens, PER_TRADE_CAP, DAILY_CAP, windowStart, windowEnd);
    }

    // ---------------------------------------------------------------
    // Happy path
    // ---------------------------------------------------------------

    function test_sessionKey_canTradeWhitelistedThroughAllowlistedAdapter() public {
        vm.prank(sessionKey);
        uint256 amountOut = policy.execute(address(adapter), tokenA, 50 ether, tokenB, 49 ether, "");

        assertEq(amountOut, 49 ether);
        assertEq(adapter.lastOwner(), user);
        assertEq(adapter.lastTokenIn(), tokenA);
        assertEq(adapter.lastAmountIn(), 50 ether);
        assertEq(adapter.lastTokenOut(), tokenB);
    }

    // ---------------------------------------------------------------
    // "A compromised agent CAN ... / It CANNOT ..." — one test per row
    // ---------------------------------------------------------------

    function test_revert_tokenNotWhitelistedForOwner() public {
        vm.prank(sessionKey);
        vm.expectRevert(CirqAgentPolicy.TokenNotWhitelisted.selector);
        policy.execute(address(adapter), tokenNotWhitelisted, 10 ether, tokenB, 1, "");
    }

    function test_revert_tokenWhitelistedForOwnerButNotInRegistry() public {
        // Belt and suspenders: admin never curated tokenNotWhitelisted, even
        // though we now grant it at the policy layer — registry still blocks it.
        address[] memory tokens = new address[](1);
        tokens[0] = tokenNotWhitelisted;
        vm.prank(user);
        policy.grantSessionKey(sessionKey, tokens, PER_TRADE_CAP, DAILY_CAP, windowStart, windowEnd);

        vm.prank(sessionKey);
        vm.expectRevert(CirqAgentPolicy.TokenNotWhitelisted.selector);
        policy.execute(address(adapter), tokenNotWhitelisted, 10 ether, address(0), 0, "");
    }

    function test_revert_adapterNotAllowlisted() public {
        vm.prank(sessionKey);
        vm.expectRevert(CirqAgentPolicy.AdapterNotAllowlisted.selector);
        policy.execute(address(unlistedAdapter), tokenA, 10 ether, tokenB, 1, "");
    }

    function test_revert_perTradeCapExceeded() public {
        vm.prank(sessionKey);
        vm.expectRevert(CirqAgentPolicy.PerTradeCapExceeded.selector);
        policy.execute(address(adapter), tokenA, PER_TRADE_CAP + 1, tokenB, 1, "");
    }

    function test_revert_dailyCapExceededByComposingTwoUnderCapTrades() public {
        vm.startPrank(sessionKey);
        // First trade: 90 ETH, under the 100 ETH per-trade cap, under the
        // 150 ETH daily cap.
        policy.execute(address(adapter), tokenA, 90 ether, tokenB, 1, "");

        // Second trade: also 90 ETH, itself under the per-trade cap, but
        // 90 + 90 = 180 > 150 daily cap — must revert on the second call,
        // not silently allow it through.
        vm.expectRevert(CirqAgentPolicy.DailyCapExceeded.selector);
        policy.execute(address(adapter), tokenA, 90 ether, tokenB, 1, "");
        vm.stopPrank();
    }

    function test_revert_outsideTradingWindow_beforeStart() public {
        vm.warp(windowStart - 1);
        vm.prank(sessionKey);
        vm.expectRevert(CirqAgentPolicy.OutsideTradingWindow.selector);
        policy.execute(address(adapter), tokenA, 10 ether, tokenB, 1, "");
    }

    function test_revert_outsideTradingWindow_afterEnd() public {
        vm.warp(windowEnd + 1);
        vm.prank(sessionKey);
        vm.expectRevert(CirqAgentPolicy.OutsideTradingWindow.selector);
        policy.execute(address(adapter), tokenA, 10 ether, tokenB, 1, "");
    }

    function test_revert_afterOwnerRevokes_evenSameCallArgsAsBefore() public {
        // Prove the epoch is checked at execution time, not grant time: the
        // exact call that succeeded before revoke must fail after it.
        vm.prank(sessionKey);
        policy.execute(address(adapter), tokenA, 10 ether, tokenB, 1, "");

        vm.prank(user);
        policy.revoke();

        vm.prank(sessionKey);
        vm.expectRevert(CirqAgentPolicy.SessionKeyRevoked.selector);
        policy.execute(address(adapter), tokenA, 10 ether, tokenB, 1, "");
    }

    function test_revert_unknownCallerHasNoSessionKey() public {
        vm.prank(attackerSessionKey);
        vm.expectRevert(CirqAgentPolicy.NotSessionKeyOwner.selector);
        policy.execute(address(adapter), tokenA, 10 ether, tokenB, 1, "");
    }

    function test_revert_whenRegistryPaused_evenWithValidCapsAndWindow() public {
        vm.prank(admin);
        registry.pause();

        vm.prank(sessionKey);
        vm.expectRevert(CirqAgentPolicy.RegistryPaused.selector);
        policy.execute(address(adapter), tokenA, 10 ether, tokenB, 1, "");
    }

    /// @notice A session key granted to one owner must never be usable
    /// against another owner's whitelist/caps, even though both keys live in
    /// the same contract's storage.
    function test_sessionKeyScopedToItsOwner_cannotUseAnotherOwnersAllowance() public {
        address[] memory attackerTokens = new address[](1);
        attackerTokens[0] = tokenNotWhitelisted; // attacker's own (different) whitelist

        vm.prank(attackerOwner);
        policy.grantSessionKey(
            attackerSessionKey, attackerTokens, PER_TRADE_CAP, DAILY_CAP, windowStart, windowEnd
        );

        // attackerSessionKey belongs to attackerOwner, not user — it must
        // not be able to trade tokenA, which is only whitelisted for user.
        vm.prank(attackerSessionKey);
        vm.expectRevert(CirqAgentPolicy.TokenNotWhitelisted.selector);
        policy.execute(address(adapter), tokenA, 10 ether, tokenB, 1, "");
    }

    /// @notice No function anywhere in this contract accepts a destination
    /// address distinct from `owner` — `IAdapter.act`'s signature has no such
    /// parameter, so there is no calldata a compromised session key could
    /// construct that redirects funds elsewhere. This test documents that
    /// guarantee by asserting the adapter always observes the true owner,
    /// never anything the session key supplies.
    function test_adapterAlwaysReceivesTrueOwner_neverAttackerSuppliedAddress() public {
        vm.prank(sessionKey);
        policy.execute(address(adapter), tokenA, 1 ether, tokenB, 1, "");
        assertEq(adapter.lastOwner(), user);
        assertTrue(adapter.lastOwner() != sessionKey);
        assertTrue(adapter.lastOwner() != attackerOwner);
    }

    /// @notice Composite "compromised agent cannot escape" test: a single
    /// fully-compromised session key, tried against every guard at once.
    function test_compromisedAgent_cannotEscapeAnyGuard() public {
        vm.startPrank(sessionKey);

        vm.expectRevert(CirqAgentPolicy.TokenNotWhitelisted.selector);
        policy.execute(address(adapter), tokenNotWhitelisted, 1 ether, tokenB, 1, "");

        vm.expectRevert(CirqAgentPolicy.AdapterNotAllowlisted.selector);
        policy.execute(address(unlistedAdapter), tokenA, 1 ether, tokenB, 1, "");

        vm.expectRevert(CirqAgentPolicy.PerTradeCapExceeded.selector);
        policy.execute(address(adapter), tokenA, PER_TRADE_CAP + 1, tokenB, 1, "");

        vm.stopPrank();

        vm.warp(windowEnd + 1);
        vm.prank(sessionKey);
        vm.expectRevert(CirqAgentPolicy.OutsideTradingWindow.selector);
        policy.execute(address(adapter), tokenA, 1 ether, tokenB, 1, "");
        vm.warp(windowStart);

        vm.prank(user);
        policy.revoke();
        vm.prank(sessionKey);
        vm.expectRevert(CirqAgentPolicy.SessionKeyRevoked.selector);
        policy.execute(address(adapter), tokenA, 1 ether, tokenB, 1, "");
    }
}
