// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {CirqRegistry} from "../src/CirqRegistry.sol";

contract CirqRegistryTest is Test {
    CirqRegistry internal registry;
    address internal owner = makeAddr("owner");
    address internal stranger = makeAddr("stranger");
    address internal token = makeAddr("token");
    address internal adapter = makeAddr("adapter");

    function setUp() public {
        registry = new CirqRegistry(owner);
    }

    function test_ownerCanAllowToken() public {
        vm.prank(owner);
        registry.setTokenAllowed(token, true);
        assertTrue(registry.isTokenAllowed(token));
    }

    function test_ownerCanRevokeToken() public {
        vm.startPrank(owner);
        registry.setTokenAllowed(token, true);
        registry.setTokenAllowed(token, false);
        vm.stopPrank();
        assertFalse(registry.isTokenAllowed(token));
    }

    function test_strangerCannotAllowToken() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.setTokenAllowed(token, true);
    }

    function test_ownerCanAllowAdapter() public {
        vm.prank(owner);
        registry.setAdapterAllowed(adapter, true);
        assertTrue(registry.isAdapterAllowed(adapter));
    }

    function test_strangerCannotAllowAdapter() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.setAdapterAllowed(adapter, true);
    }

    function test_strangerCannotPause() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.pause();
    }

    function test_ownerCanPauseAndUnpause() public {
        vm.startPrank(owner);
        registry.pause();
        assertTrue(registry.paused());
        registry.unpause();
        assertFalse(registry.paused());
        vm.stopPrank();
    }
}
