// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CopilotRegistry
 * @notice A lightweight registry mapping AI trading agent addresses to human-readable
 * profiles and metadata.
 *
 * Each registered agent gets a display name and a metadata URI pointing to an
 * off-chain profile (strategy description, risk level, performance history, etc.).
 * Aggregate stats are available by querying a DecisionLog contract address.
 *
 * @dev Uses OpenZeppelin Ownable. Only the owner can register, update, or deactivate agents.
 */
contract CopilotRegistry is Ownable {
    // -------------------------------------------------------------------------
    // Data structures
    // -------------------------------------------------------------------------

    /**
     * @notice Profile information for a registered copilot agent.
     * @param displayName Human-readable agent name, e.g. "XPilot Momentum v1".
     * @param metadataURI URI pointing to off-chain metadata JSON (strategy doc,
     * risk parameters, performance history, etc.).
     * @param registeredAt Timestamp when the agent was first registered.
     * @param active Whether this agent is currently active. Inactive agents
     * are still readable but may be filtered by frontends.
     */
    struct CopilotInfo {
        string displayName;
        string metadataURI;
        uint256 registeredAt;
        bool active;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice Mapping from agent address to its profile info.
    mapping(address => CopilotInfo) private _copilots;

    /// @notice Ordered list of all registered agent addresses (including deactivated).
    address[] private _copilotAddresses;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /**
     * @notice Emitted when a new agent is registered by the owner.
     * @param agentAddr The agent's address.
     * @param displayName The human-readable display name.
     * @param metadataURI URI to off-chain profile metadata.
     */
    event AgentRegistered(
        address indexed agentAddr,
        string displayName,
        string metadataURI
    );

    /**
     * @notice Emitted when an agent's profile is updated.
     * @param agentAddr The agent's address.
     * @param displayName The updated display name.
     * @param metadataURI The updated metadata URI.
     */
    event AgentUpdated(
        address indexed agentAddr,
        string displayName,
        string metadataURI
    );

    /**
     * @notice Emitted when an agent is deactivated (paused, not removed).
     * @param agentAddr The agent's address.
     */
    event AgentDeactivated(address indexed agentAddr);

    /**
     * @notice Emitted when a previously deactivated agent is reactivated.
     * @param agentAddr The agent's address.
     */
    event AgentActivated(address indexed agentAddr);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * @notice Deploys the CopilotRegistry.
     * @param initialOwner The address that will own the registry.
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    // -------------------------------------------------------------------------
    // Write functions
    // -------------------------------------------------------------------------

    /**
     * @notice Register a new copilot agent. Only callable by the owner.
     * @dev Reverts if the agent is already registered (active or inactive).
     * @param agentAddr The agent's EOA or contract address.
     * @param displayName A human-readable name, e.g. "XPilot Momentum v1".
     * @param metadataURI URI to an off-chain JSON metadata file.
     */
    function registerAgent(
        address agentAddr,
        string calldata displayName,
        string calldata metadataURI
    ) external onlyOwner {
        require(agentAddr != address(0), "CopilotRegistry: zero address");
        require(bytes(displayName).length > 0, "CopilotRegistry: name required");
        require(!_isRegistered(agentAddr), "CopilotRegistry: already registered");

        _copilots[agentAddr] = CopilotInfo({
            displayName: displayName,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            active: true
        });
        _copilotAddresses.push(agentAddr);

        emit AgentRegistered(agentAddr, displayName, metadataURI);
    }

    /**
     * @notice Update an existing agent's display name and/or metadata URI.
     * Only callable by the owner.
     * @param agentAddr The agent address to update.
     * @param displayName The new display name.
     * @param metadataURI The new metadata URI.
     */
    function updateAgent(
        address agentAddr,
        string calldata displayName,
        string calldata metadataURI
    ) external onlyOwner {
        require(_isRegistered(agentAddr), "CopilotRegistry: not registered");
        require(bytes(displayName).length > 0, "CopilotRegistry: name required");

        CopilotInfo storage info = _copilots[agentAddr];
        info.displayName = displayName;
        info.metadataURI = metadataURI;

        emit AgentUpdated(agentAddr, displayName, metadataURI);
    }

    /**
     * @notice Deactivate an agent without removing its profile data.
     * Only callable by the owner.
     * @param agentAddr The agent address to deactivate.
     */
    function deactivateAgent(address agentAddr) external onlyOwner {
        require(_isRegistered(agentAddr), "CopilotRegistry: not registered");
        require(_copilots[agentAddr].active, "CopilotRegistry: already inactive");

        _copilots[agentAddr].active = false;
        emit AgentDeactivated(agentAddr);
    }

    /**
     * @notice Reactivate a previously deactivated agent.
     * Only callable by the owner.
     * @param agentAddr The agent address to reactivate.
     */
    function activateAgent(address agentAddr) external onlyOwner {
        require(_isRegistered(agentAddr), "CopilotRegistry: not registered");
        require(!_copilots[agentAddr].active, "CopilotRegistry: already active");

        _copilots[agentAddr].active = true;
        emit AgentActivated(agentAddr);
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    /**
     * @notice Retrieve the profile info for a registered copilot.
     * @param agentAddr The agent address to look up.
     * @return info CopilotInfo struct (displayName, metadataURI, registeredAt, active).
     */
    function getCopilot(
        address agentAddr
    ) external view returns (CopilotInfo memory info) {
        require(_isRegistered(agentAddr), "CopilotRegistry: not registered");
        info = _copilots[agentAddr];
    }

    /**
     * @notice Check whether an agent address is registered (active or inactive).
     * @param agentAddr The address to check.
     * @return registered True if the address has ever been registered.
     */
    function isRegistered(address agentAddr) external view returns (bool registered) {
        registered = _isRegistered(agentAddr);
    }

    /**
     * @notice Returns the total number of agents ever registered.
     * @return count Total registered agents (including deactivated).
     */
    function getCopilotCount() external view returns (uint256 count) {
        count = _copilotAddresses.length;
    }

    /**
     * @notice Returns the list of all registered agent addresses.
     * @param offset Pagination offset (0-based).
     * @param limit Maximum number of addresses to return.
     * @return addrs Array of agent addresses.
     * @return total Total number of registered agents.
     */
    function getCopilotAddresses(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory addrs, uint256 total) {
        total = _copilotAddresses.length;

        uint256 end = offset + limit;
        if (end > total) end = total;
        if (offset >= total) return (new address[](0), total);

        uint256 resultLen = end - offset;
        addrs = new address[](resultLen);
        for (uint256 i = 0; i < resultLen; i++) {
            addrs[i] = _copilotAddresses[offset + i];
        }
    }

    /**
     * @notice Get aggregate stats for a copilot by querying a DecisionLog contract.
     * @dev Win rate is returned as a placeholder (0) until outcome-based computation
     * is implemented. Total decisions come directly from the DecisionLog.
     * @param agentAddr The agent address to query stats for.
     * @param decisionLog The address of the DecisionLog contract.
     * @return totalDecisions Total decisions committed by this agent.
     * @return winRateBps Win rate in basis points (placeholder — always 0 for now).
     */
    function getCopilotStats(
        address agentAddr,
        address decisionLog
    ) external view returns (uint256 totalDecisions, uint256 winRateBps) {
        require(_isRegistered(agentAddr), "CopilotRegistry: not registered");

        // Query the DecisionLog for the agent's total decision count.
        // We use a low-level staticcall to avoid a hard compile-time dependency.
        (bool success, bytes memory data) = decisionLog.staticcall(
            abi.encodeWithSignature("getAgentDecisionCount(address)", agentAddr)
        );
        if (success && data.length == 32) {
            totalDecisions = abi.decode(data, (uint256));
        }
        // else totalDecisions stays 0

        // Win rate is a placeholder — to be computed from outcomes in a future iteration.
        winRateBps = 0;
    }

    // -------------------------------------------------------------------------
    // Internal functions
    // -------------------------------------------------------------------------

    /**
     * @dev Returns true if the address has ever been registered (checks registeredAt > 0).
     */
    function _isRegistered(address agentAddr) internal view returns (bool) {
        return _copilots[agentAddr].registeredAt > 0;
    }
}
