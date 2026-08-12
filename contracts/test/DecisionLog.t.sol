// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DecisionLog.sol";

contract DecisionLogTest is Test {
    DecisionLog public dl;
    address public owner = address(0xAAAA);
    address public agent = address(0xBEEF);
    address public stranger = address(0xCAFE);

    // Action constants from DecisionLog for readability.
    uint8 internal constant HOLD = 0;
    uint8 internal constant BUY  = 1;
    uint8 internal constant SELL = 2;

    // Sample reasoning text used across tests.
    string internal constant REASONING = "Market shows bullish divergence on 4h RSI. "
        "ETH/USDC liquidity is deep ($2M+ within 1% slippage). "
        "Recommend BUY with 85% confidence. Stop loss at -5%.";

    bytes32 internal reasoningHash;

    function setUp() public {
        reasoningHash = keccak256(bytes(REASONING));
        dl = new DecisionLog(owner, agent);
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    function test_Constructor_SetsOwnerAndAgent() public {
        assertEq(dl.owner(), owner);
        assertEq(dl.authorizedAgent(), agent);
        assertEq(dl.decisionCount(), 0);
    }

    function test_Constructor_RevertsOnZeroAgent() public {
        vm.expectRevert("DecisionLog: zero agent address");
        new DecisionLog(owner, address(0));
    }

    // -------------------------------------------------------------------------
    // commitDecision
    // -------------------------------------------------------------------------

    function test_CommitDecision_StoresCorrectly() public {
        vm.prank(agent);
        uint256 id = dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);

        assertEq(id, 0);
        assertEq(dl.decisionCount(), 1);

        DecisionLog.Decision memory d = dl.getDecision(0);
        assertEq(d.id, 0);
        assertEq(d.agentAddr, agent);
        assertEq(d.decisionHash, reasoningHash);
        assertEq(d.action, BUY);
        assertEq(d.confidenceBps, 8500);
        assertGt(d.timestamp, 0);
        assertFalse(d.revealed);
        assertFalse(d.outcomeRecorded);
        assertEq(d.pnlBps, 0);
    }

    function test_CommitDecision_EmitsEvent() public {
        vm.prank(agent);
        vm.expectEmit(true, true, false, true);
        emit DecisionLog.DecisionCommitted(0, agent, reasoningHash, "ETH/USDC", BUY, 8500, block.timestamp);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);
    }

    function test_CommitDecision_ReturnsIncrementingIds() public {
        vm.startPrank(agent);
        assertEq(dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8000), 0);
        assertEq(dl.commitDecision(reasoningHash, "BTC/USDC", SELL, 7000), 1);
        assertEq(dl.commitDecision(reasoningHash, "SOL/USDC", HOLD, 5000), 2);
        assertEq(dl.decisionCount(), 3);
        vm.stopPrank();
    }

    function test_CommitDecision_AllowsSameHash() public {
        vm.startPrank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8000);
        dl.commitDecision(reasoningHash, "BTC/USDC", BUY, 8000);
        vm.stopPrank();
        assertEq(dl.decisionCount(), 2);
    }

    function test_CommitDecision_AllActions() public {
        vm.startPrank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", HOLD, 5000);
        assertEq(dl.getDecision(0).action, HOLD);

        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 5000);
        assertEq(dl.getDecision(1).action, BUY);

        dl.commitDecision(reasoningHash, "ETH/USDC", SELL, 5000);
        assertEq(dl.getDecision(2).action, SELL);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // commitDecision — reverts
    // -------------------------------------------------------------------------

    function test_CommitDecision_RevertsOnInvalidAction() public {
        vm.prank(agent);
        vm.expectRevert("DecisionLog: invalid action");
        dl.commitDecision(reasoningHash, "ETH/USDC", 3, 5000);
    }

    function test_CommitDecision_RevertsOnConfidenceTooHigh() public {
        vm.prank(agent);
        vm.expectRevert("DecisionLog: confidence exceeds 10000 bps");
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 10001);
    }

    function test_CommitDecision_MaxConfidenceOk() public {
        vm.prank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 10000);
        assertEq(dl.decisionCount(), 1);
    }

    function test_CommitDecision_RevertsOnUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert("DecisionLog: caller is not the agent");
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 5000);
    }

    // -------------------------------------------------------------------------
    // revealReasoning
    // -------------------------------------------------------------------------

    function test_RevealReasoning_Success() public {
        vm.startPrank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);

        vm.expectEmit(true, false, false, true);
        emit DecisionLog.ReasoningRevealed(0, REASONING);
        dl.revealReasoning(0, REASONING);

        assertTrue(dl.getDecision(0).revealed);
        vm.stopPrank();
    }

    function test_RevealReasoning_RevertsOnHashMismatch() public {
        vm.startPrank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);

        vm.expectRevert("DecisionLog: reasoning hash mismatch");
        dl.revealReasoning(0, "Completely different reasoning text - wrong!");
        vm.stopPrank();
    }

    function test_RevealReasoning_RevertsOnDoubleReveal() public {
        vm.startPrank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);
        dl.revealReasoning(0, REASONING);

        vm.expectRevert("DecisionLog: already revealed");
        dl.revealReasoning(0, REASONING);
        vm.stopPrank();
    }

    function test_RevealReasoning_RevertsOnInvalidId() public {
        vm.prank(agent);
        vm.expectRevert("DecisionLog: decision not found");
        dl.revealReasoning(999, REASONING);
    }

    function test_RevealReasoning_RevertsOnUnauthorized() public {
        vm.prank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);

        vm.prank(stranger);
        vm.expectRevert("DecisionLog: caller is not the agent");
        dl.revealReasoning(0, REASONING);
    }

    // -------------------------------------------------------------------------
    // recordOutcome
    // -------------------------------------------------------------------------

    function test_RecordOutcome_PositivePnl() public {
        vm.startPrank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);

        vm.expectEmit(true, false, false, true);
        emit DecisionLog.OutcomeRecorded(0, 500);
        dl.recordOutcome(0, 500);

        DecisionLog.Decision memory d = dl.getDecision(0);
        assertTrue(d.outcomeRecorded);
        assertEq(d.pnlBps, 500);
        vm.stopPrank();
    }

    function test_RecordOutcome_NegativePnl() public {
        vm.startPrank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);
        dl.recordOutcome(0, -300);

        DecisionLog.Decision memory d = dl.getDecision(0);
        assertTrue(d.outcomeRecorded);
        assertEq(d.pnlBps, -300);
        vm.stopPrank();
    }

    function test_RecordOutcome_ZeroPnl() public {
        vm.startPrank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", HOLD, 5000);
        dl.recordOutcome(0, 0);

        DecisionLog.Decision memory d = dl.getDecision(0);
        assertEq(d.pnlBps, 0);
        assertTrue(d.outcomeRecorded);
        vm.stopPrank();
    }

    function test_RecordOutcome_RevertsOnDoubleRecord() public {
        vm.startPrank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);
        dl.recordOutcome(0, 100);

        vm.expectRevert("DecisionLog: outcome already recorded");
        dl.recordOutcome(0, 200);
        vm.stopPrank();
    }

    function test_RecordOutcome_RevertsOnInvalidId() public {
        vm.prank(agent);
        vm.expectRevert("DecisionLog: decision not found");
        dl.recordOutcome(42, 100);
    }

    function test_RecordOutcome_RevertsOnUnauthorized() public {
        vm.prank(agent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);

        vm.prank(stranger);
        vm.expectRevert("DecisionLog: caller is not the agent");
        dl.recordOutcome(0, 100);
    }

    // -------------------------------------------------------------------------
    // setAgent
    // -------------------------------------------------------------------------

    function test_SetAgent_Success() public {
        address newAgent = address(0xD00D);

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit DecisionLog.AgentUpdated(agent, newAgent);
        dl.setAgent(newAgent);

        assertEq(dl.authorizedAgent(), newAgent);

        // Old agent can no longer commit.
        vm.prank(agent);
        vm.expectRevert("DecisionLog: caller is not the agent");
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 5000);

        // New agent can commit.
        vm.prank(newAgent);
        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 5000);
        assertEq(dl.decisionCount(), 1);
    }

    function test_SetAgent_RevertsOnNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert(); // Ownable
        dl.setAgent(address(0xD00D));
    }

    function test_SetAgent_RevertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("DecisionLog: zero agent address");
        dl.setAgent(address(0));
    }

    // -------------------------------------------------------------------------
    // getAgentDecisionCount
    // -------------------------------------------------------------------------

    function test_GetAgentDecisionCount() public {
        vm.startPrank(agent);
        assertEq(dl.getAgentDecisionCount(agent), 0);

        dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8000);
        dl.commitDecision(reasoningHash, "BTC/USDC", SELL, 7000);
        dl.commitDecision(reasoningHash, "SOL/USDC", HOLD, 5000);

        assertEq(dl.getAgentDecisionCount(agent), 3);
        assertEq(dl.getAgentDecisionCount(stranger), 0);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // getDecisionIdsByAgent — pagination
    // -------------------------------------------------------------------------

    function test_GetDecisionIdsByAgent_FullList() public {
        vm.startPrank(agent);
        for (uint256 i = 0; i < 5; i++) {
            dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8000);
        }

        (uint256[] memory ids, uint256 total) = dl.getDecisionIdsByAgent(agent, 0, 10);
        assertEq(total, 5);
        assertEq(ids.length, 5);
        assertEq(ids[0], 0);
        assertEq(ids[4], 4);
        vm.stopPrank();
    }

    function test_GetDecisionIdsByAgent_Pagination() public {
        vm.startPrank(agent);
        for (uint256 i = 0; i < 10; i++) {
            dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8000);
        }

        // Page 1: offset=0, limit=3
        (uint256[] memory page1, uint256 total1) = dl.getDecisionIdsByAgent(agent, 0, 3);
        assertEq(total1, 10);
        assertEq(page1.length, 3);
        assertEq(page1[0], 0);
        assertEq(page1[2], 2);

        // Page 2: offset=3, limit=3
        (uint256[] memory page2, uint256 total2) = dl.getDecisionIdsByAgent(agent, 3, 3);
        assertEq(total2, 10);
        assertEq(page2.length, 3);
        assertEq(page2[0], 3);
        assertEq(page2[2], 5);

        // Last partial page
        (uint256[] memory page3, uint256 total3) = dl.getDecisionIdsByAgent(agent, 9, 5);
        assertEq(total3, 10);
        assertEq(page3.length, 1);
        assertEq(page3[0], 9);

        // Past-the-end offset
        (uint256[] memory page4, uint256 total4) = dl.getDecisionIdsByAgent(agent, 20, 5);
        assertEq(total4, 10);
        assertEq(page4.length, 0);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // Full lifecycle: commit -> reveal -> record
    // -------------------------------------------------------------------------

    function test_FullLifecycle() public {
        vm.startPrank(agent);

        // 1. Commit
        uint256 id = dl.commitDecision(reasoningHash, "ETH/USDC", BUY, 8500);
        DecisionLog.Decision memory d1 = dl.getDecision(id);
        assertEq(d1.assetPair, "ETH/USDC");
        assertEq(d1.action, BUY);
        assertFalse(d1.revealed);
        assertFalse(d1.outcomeRecorded);

        // 2. Reveal
        dl.revealReasoning(id, REASONING);
        DecisionLog.Decision memory d2 = dl.getDecision(id);
        assertTrue(d2.revealed);

        // 3. Record outcome
        dl.recordOutcome(id, 420);
        DecisionLog.Decision memory d3 = dl.getDecision(id);
        assertTrue(d3.outcomeRecorded);
        assertEq(d3.pnlBps, 420);
        assertTrue(d3.revealed);

        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // getDecision — reverts on invalid ID
    // -------------------------------------------------------------------------

    function test_GetDecision_RevertsOnInvalidId() public {
        vm.expectRevert("DecisionLog: decision not found");
        dl.getDecision(0);
    }
}
