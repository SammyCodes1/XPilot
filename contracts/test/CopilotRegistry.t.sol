// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CopilotRegistry.sol";
import "../src/DecisionLog.sol";

contract CopilotRegistryTest is Test {
    CopilotRegistry public registry;
    DecisionLog public decisionLog;
    address public owner = address(0xAAAA);
    address public agent = address(0xBEEF);
    address public stranger = address(0xCAFE);

    function setUp() public {
        registry = new CopilotRegistry(owner);
        decisionLog = new DecisionLog(owner, agent);
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    function test_Constructor_SetsOwner() public {
        assertEq(registry.owner(), owner);
    }

    // -------------------------------------------------------------------------
    // registerAgent — happy path
    // -------------------------------------------------------------------------

    function test_RegisterAgent_Success() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit CopilotRegistry.AgentRegistered(
            agent,
            "XPilot Momentum v1",
            "ipfs://QmMetadata"
        );
        registry.registerAgent(agent, "XPilot Momentum v1", "ipfs://QmMetadata");

        CopilotRegistry.CopilotInfo memory info = registry.getCopilot(agent);
        assertEq(info.displayName, "XPilot Momentum v1");
        assertEq(info.metadataURI, "ipfs://QmMetadata");
        assertTrue(info.active);
        assertGt(info.registeredAt, 0);
        assertTrue(registry.isRegistered(agent));
    }

    function test_RegisterAgent_MultipleAgents() public {
        vm.startPrank(owner);
        registry.registerAgent(agent, "Agent One", "ipfs://one");
        registry.registerAgent(stranger, "Agent Two", "ipfs://two");

        assertEq(registry.getCopilotCount(), 2);

        CopilotRegistry.CopilotInfo memory a1 = registry.getCopilot(agent);
        CopilotRegistry.CopilotInfo memory a2 = registry.getCopilot(stranger);
        assertEq(a1.displayName, "Agent One");
        assertEq(a2.displayName, "Agent Two");
        vm.stopPrank();
    }

    function test_RegisterAgent_AllowsEmptyMetadataURI() public {
        vm.prank(owner);
        registry.registerAgent(agent, "XPilot", "");
        CopilotRegistry.CopilotInfo memory info = registry.getCopilot(agent);
        assertEq(info.metadataURI, "");
    }

    // -------------------------------------------------------------------------
    // registerAgent — reverts
    // -------------------------------------------------------------------------

    function test_RegisterAgent_RevertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("CopilotRegistry: zero address");
        registry.registerAgent(address(0), "XPilot", "ipfs://x");
    }

    function test_RegisterAgent_RevertsOnEmptyName() public {
        vm.prank(owner);
        vm.expectRevert("CopilotRegistry: name required");
        registry.registerAgent(agent, "", "ipfs://x");
    }

    function test_RegisterAgent_RevertsOnDuplicate() public {
        vm.startPrank(owner);
        registry.registerAgent(agent, "XPilot", "ipfs://x");
        vm.expectRevert("CopilotRegistry: already registered");
        registry.registerAgent(agent, "XPilot v2", "ipfs://y");
        vm.stopPrank();
    }

    function test_RegisterAgent_RevertsOnUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert(); // Ownable
        registry.registerAgent(agent, "XPilot", "ipfs://x");
    }

    // -------------------------------------------------------------------------
    // updateAgent — happy path
    // -------------------------------------------------------------------------

    function test_UpdateAgent_Success() public {
        vm.startPrank(owner);
        registry.registerAgent(agent, "Original", "ipfs://orig");

        vm.expectEmit(true, false, false, true);
        emit CopilotRegistry.AgentUpdated(agent, "Updated", "ipfs://updated");
        registry.updateAgent(agent, "Updated", "ipfs://updated");

        CopilotRegistry.CopilotInfo memory info = registry.getCopilot(agent);
        assertEq(info.displayName, "Updated");
        assertEq(info.metadataURI, "ipfs://updated");
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // updateAgent — reverts
    // -------------------------------------------------------------------------

    function test_UpdateAgent_RevertsOnUnregistered() public {
        vm.prank(owner);
        vm.expectRevert("CopilotRegistry: not registered");
        registry.updateAgent(agent, "Name", "ipfs://x");
    }

    function test_UpdateAgent_RevertsOnEmptyName() public {
        vm.startPrank(owner);
        registry.registerAgent(agent, "XPilot", "ipfs://x");
        vm.expectRevert("CopilotRegistry: name required");
        registry.updateAgent(agent, "", "ipfs://x");
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // deactivateAgent
    // -------------------------------------------------------------------------

    function test_DeactivateAgent_Success() public {
        vm.startPrank(owner);
        registry.registerAgent(agent, "XPilot", "ipfs://x");

        vm.expectEmit(true, false, false, true);
        emit CopilotRegistry.AgentDeactivated(agent);
        registry.deactivateAgent(agent);

        CopilotRegistry.CopilotInfo memory info = registry.getCopilot(agent);
        assertFalse(info.active);
        assertTrue(registry.isRegistered(agent)); // Still registered, just inactive
        vm.stopPrank();
    }

    function test_DeactivateAgent_RevertsOnUnregistered() public {
        vm.prank(owner);
        vm.expectRevert("CopilotRegistry: not registered");
        registry.deactivateAgent(agent);
    }

    function test_DeactivateAgent_RevertsOnAlreadyInactive() public {
        vm.startPrank(owner);
        registry.registerAgent(agent, "XPilot", "ipfs://x");
        registry.deactivateAgent(agent);
        vm.expectRevert("CopilotRegistry: already inactive");
        registry.deactivateAgent(agent);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // activateAgent
    // -------------------------------------------------------------------------

    function test_ActivateAgent_Success() public {
        vm.startPrank(owner);
        registry.registerAgent(agent, "XPilot", "ipfs://x");
        registry.deactivateAgent(agent);

        vm.expectEmit(true, false, false, true);
        emit CopilotRegistry.AgentActivated(agent);
        registry.activateAgent(agent);

        CopilotRegistry.CopilotInfo memory info = registry.getCopilot(agent);
        assertTrue(info.active);
        vm.stopPrank();
    }

    function test_ActivateAgent_RevertsOnUnregistered() public {
        vm.prank(owner);
        vm.expectRevert("CopilotRegistry: not registered");
        registry.activateAgent(agent);
    }

    function test_ActivateAgent_RevertsOnAlreadyActive() public {
        vm.startPrank(owner);
        registry.registerAgent(agent, "XPilot", "ipfs://x");
        vm.expectRevert("CopilotRegistry: already active");
        registry.activateAgent(agent);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // isRegistered
    // -------------------------------------------------------------------------

    function test_IsRegistered_ReturnsFalse() public {
        assertFalse(registry.isRegistered(agent));
    }

    function test_IsRegistered_ReturnsTrueEvenWhenInactive() public {
        vm.startPrank(owner);
        registry.registerAgent(agent, "XPilot", "ipfs://x");
        assertTrue(registry.isRegistered(agent));

        registry.deactivateAgent(agent);
        assertTrue(registry.isRegistered(agent));
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // getCopilot — reverts
    // -------------------------------------------------------------------------

    function test_GetCopilot_RevertsOnUnregistered() public {
        vm.expectRevert("CopilotRegistry: not registered");
        registry.getCopilot(agent);
    }

    // -------------------------------------------------------------------------
    // getCopilotAddresses — pagination
    // -------------------------------------------------------------------------

    function test_GetCopilotAddresses_Pagination() public {
        address addr1 = address(0x1000);
        address addr2 = address(0x2000);
        address addr3 = address(0x3000);
        address addr4 = address(0x4000);

        vm.startPrank(owner);
        registry.registerAgent(addr1, "A1", "");
        registry.registerAgent(addr2, "A2", "");
        registry.registerAgent(addr3, "A3", "");
        registry.registerAgent(addr4, "A4", "");

        // Full list
        (address[] memory all, uint256 total) = registry.getCopilotAddresses(0, 10);
        assertEq(total, 4);
        assertEq(all.length, 4);
        assertEq(all[0], addr1);
        assertEq(all[3], addr4);

        // Subset
        (address[] memory subset, uint256 total2) = registry.getCopilotAddresses(1, 2);
        assertEq(total2, 4);
        assertEq(subset.length, 2);
        assertEq(subset[0], addr2);
        assertEq(subset[1], addr3);

        // Past end
        (address[] memory empty, uint256 total3) = registry.getCopilotAddresses(10, 5);
        assertEq(total3, 4);
        assertEq(empty.length, 0);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // getCopilotStats
    // -------------------------------------------------------------------------

    function test_GetCopilotStats_QueriesDecisionLog() public {
        // Register the agent
        vm.prank(owner);
        registry.registerAgent(agent, "XPilot", "ipfs://x");

        // Commit some decisions
        vm.startPrank(agent);
        bytes32 hash = keccak256(bytes("reasoning"));
        decisionLog.commitDecision(hash, "ETH/USDC", 1, 8000);
        decisionLog.commitDecision(hash, "BTC/USDC", 2, 7000);
        decisionLog.commitDecision(hash, "SOL/USDC", 0, 5000);
        vm.stopPrank();

        (uint256 totalDecisions, uint256 winRateBps) = registry.getCopilotStats(
            agent,
            address(decisionLog)
        );
        assertEq(totalDecisions, 3);
        assertEq(winRateBps, 0); // Placeholder
    }

    function test_GetCopilotStats_ZeroDecisions() public {
        vm.prank(owner);
        registry.registerAgent(agent, "XPilot", "ipfs://x");

        (uint256 totalDecisions, uint256 winRateBps) = registry.getCopilotStats(
            agent,
            address(decisionLog)
        );
        assertEq(totalDecisions, 0);
        assertEq(winRateBps, 0);
    }

    function test_GetCopilotStats_RevertsOnUnregistered() public {
        vm.expectRevert("CopilotRegistry: not registered");
        registry.getCopilotStats(agent, address(decisionLog));
    }

    // -------------------------------------------------------------------------
    // Integration: registry + decision log working together
    // -------------------------------------------------------------------------

    function test_Integration_RegisterCommitQuery() public {
        // 1. Owner registers a new agent
        vm.prank(owner);
        registry.registerAgent(agent, "XPilot Momentum v1", "ipfs://profile");

        // Verify registration
        assertTrue(registry.isRegistered(agent));
        CopilotRegistry.CopilotInfo memory info = registry.getCopilot(agent);
        assertEq(info.displayName, "XPilot Momentum v1");

        // 2. Agent commits decisions
        bytes32 hash = keccak256(bytes("Buy ETH - bullish divergence"));
        vm.startPrank(agent);
        decisionLog.commitDecision(hash, "ETH/USDC", 1, 8500);
        decisionLog.commitDecision(hash, "BTC/USDC", 2, 6000);
        vm.stopPrank();

        // 3. Stats reflect the decisions
        (uint256 total,) = registry.getCopilotStats(agent, address(decisionLog));
        assertEq(total, 2);
    }
}
