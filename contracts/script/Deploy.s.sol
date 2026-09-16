// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {CirqRegistry} from "../src/CirqRegistry.sol";
import {CirqAgentPolicy} from "../src/CirqAgentPolicy.sol";

/// @notice Deploys the two Cirq contracts. Reads every live value it needs
/// from ../lib/cirq-config/addresses.json — the same file
/// lib/cirq-config's TypeScript loader validates — and refuses to run if any
/// value it reads is still a `⚠️ FILL IN` placeholder. See
/// docs/cirq-backend/LIVE-VALUES.md.
///
/// This script deploys the registry and policy only. Populating the
/// registry's token/adapter allowlist from the same config is a deliberate,
/// separate step (see `run`'s final comment) so a deploy never silently
/// allow-lists something without an operator looking at it.
contract Deploy is Script {
    function run() external {
        string memory json = vm.readFile(_configPath());

        // Fail loudly, before broadcasting anything, if the values this
        // deploy actually depends on are still placeholders. Reading them
        // here (even though this script doesn't yet use them beyond this
        // check) keeps the "never deploy against a fabricated address" rule
        // enforced at the point of deployment, not just in the TS loader.
        _requireAddress(json, ".protocols.morpho.core");
        _requireAddress(json, ".protocols.loopr.router");
        _requireAddress(json, ".protocols.uniswap.poolManager");
        _requireAddress(json, ".protocols.uniswap.universalRouter");

        vm.startBroadcast();
        CirqRegistry registry = new CirqRegistry(msg.sender);
        CirqAgentPolicy policy = new CirqAgentPolicy(registry);
        vm.stopBroadcast();

        console2.log("CirqRegistry deployed at:", address(registry));
        console2.log("CirqAgentPolicy deployed at:", address(policy));
        console2.log(
            "Next: allow-list tokens/adapters on the registry deliberately, "
            "e.g. via a follow-up script or cast calls — this deploy does not "
            "auto-populate the allowlist."
        );
    }

    function _configPath() internal view returns (string memory) {
        return string.concat(vm.projectRoot(), "/../lib/cirq-config/addresses.json");
    }

    function _isFillIn(string memory s) internal pure returns (bool) {
        bytes memory b = bytes(s);
        bytes memory prefix = bytes(unicode"⚠️");
        if (b.length < prefix.length) return false;
        for (uint256 i = 0; i < prefix.length; i++) {
            if (b[i] != prefix[i]) return false;
        }
        return true;
    }

    function _requireAddress(string memory json, string memory key) internal returns (address) {
        string memory raw = vm.parseJsonString(json, key);
        if (_isFillIn(raw)) {
            revert(string.concat("Cirq config value not filled in: ", key));
        }
        return vm.parseJsonAddress(json, key);
    }
}
