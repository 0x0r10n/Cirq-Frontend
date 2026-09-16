// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice The curated allowlist + global pause switch. This is the only
/// place Cirq expresses an opinion about which tokens and adapters the agent
/// may touch — it is a list, not a market. It never holds funds and never
/// receives token transfers. See docs/cirq-backend/CONTRACTS.md.
contract CirqRegistry is Ownable, Pausable {
    mapping(address token => bool allowed) public allowedTokens;
    mapping(address adapter => bool allowed) public allowedAdapters;

    event TokenAllowedSet(address indexed token, bool allowed);
    event AdapterAllowedSet(address indexed adapter, bool allowed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        allowedTokens[token] = allowed;
        emit TokenAllowedSet(token, allowed);
    }

    function setAdapterAllowed(address adapter, bool allowed) external onlyOwner {
        allowedAdapters[adapter] = allowed;
        emit AdapterAllowedSet(adapter, allowed);
    }

    /// @notice Halts all agent-initiated activity across every venue at
    /// once, for incident response. Must never gate a user's ability to act
    /// directly themselves — only `CirqAgentPolicy`'s agent-driven path
    /// checks this.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function isTokenAllowed(address token) external view returns (bool) {
        return allowedTokens[token];
    }

    function isAdapterAllowed(address adapter) external view returns (bool) {
        return allowedAdapters[adapter];
    }
}
