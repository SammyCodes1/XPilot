// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DecisionLog
 * @notice On-chain registry for AI trading decisions with commit-reveal verification.
 *
 * The authorized AI agent commits a hash of its trade reasoning BEFORE executing
 * a trade. It then reveals the full reasoning text, which is verified against the
 * stored hash and emitted in an event. Outcomes can be recorded later to build an
 * auditable on-chain track record.
 *
 * @dev Uses OpenZeppelin Ownable for access control. Only the designated `authorizedAgent`
 * can commit decisions, reveal reasoning, or record outcomes. The owner can change
 * the authorized agent address.
 */
contract DecisionLog is Ownable {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice No action recommended.
    uint8 public constant ACTION_HOLD = 0;

    /// @notice Buy / go long on the asset pair.
    uint8 public constant ACTION_BUY = 1;

    /// @notice Sell / go short on the asset pair.
    uint8 public constant ACTION_SELL = 2;

    /// @notice Maximum confidence in basis points (10000 = 100%).
    uint256 public constant MAX_CONFIDENCE_BPS = 10_000;

    // -------------------------------------------------------------------------
    // Data structures
    // -------------------------------------------------------------------------

    /**
     * @notice Represents a single AI trading decision logged on-chain.
     * @dev reasoningText is NOT stored — only emitted via event to save gas.
     * @param id Sequential decision identifier.
     * @param agentAddr The authorized agent that made this decision.
     * @param decisionHash keccak256 of the full reasoning text (set at commit time).
     * @param assetPair Human-readable trading pair, e.g. "ETH/USDC".
     * @param action One of ACTION_HOLD (0), ACTION_BUY (1), or ACTION_SELL (2).
     * @param confidenceBps Agent confidence in basis points (0–10000).
     * @param timestamp Block timestamp when the decision was committed.
     * @param revealed Whether the reasoning has been revealed and verified.
     * @param outcomeRecorded Whether a PnL outcome has been logged for this decision.
     * @param pnlBps Realized profit or loss in basis points (only valid when outcomeRecorded is true).
     */
    struct Decision {
        uint256 id;
        address agentAddr;
        bytes32 decisionHash;
        string assetPair;
        uint8 action;
        uint256 confidenceBps;
        uint256 timestamp;
        bool revealed;
        bool outcomeRecorded;
        int256 pnlBps;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice All decisions keyed by their sequential ID.
    mapping(uint256 => Decision) private _decisions;

    /// @notice Per-agent list of decision IDs for efficient lookup.
    mapping(address => uint256[]) private _agentDecisionIds;

    /// @notice Total number of decisions ever committed (also serves as the next ID).
    uint256 public decisionCount;

    /// @notice The address authorised to commit, reveal, and record outcomes.
    address public authorizedAgent;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /**
     * @notice Emitted when a new trading decision is committed (pre-execution).
     * @param decisionId The sequential ID assigned to this decision.
     * @param agent The authorized agent that made the decision.
     * @param decisionHash keccak256 of the reasoning text (revealed later).
     * @param assetPair The trading pair.
     * @param action The action code (0=HOLD, 1=BUY, 2=SELL).
     * @param confidenceBps Agent confidence in basis points.
     * @param timestamp Block timestamp of the commit.
     */
    event DecisionCommitted(
        uint256 indexed decisionId,
        address indexed agent,
        bytes32 decisionHash,
        string assetPair,
        uint8 action,
        uint256 confidenceBps,
        uint256 timestamp
    );

    /**
     * @notice Emitted when the agent reveals the full reasoning text for a past decision.
     * @dev The full text is only available in this event, not in contract storage,
     * to keep gas costs low. Indexers and frontends should archive these events.
     * @param decisionId The ID of the decision being revealed.
     * @param reasoningText The complete plaintext reasoning that hashes to the
     * previously committed decisionHash.
     */
    event ReasoningRevealed(
        uint256 indexed decisionId,
        string reasoningText
    );

    /**
     * @notice Emitted when a PnL outcome is recorded for a past decision.
     * @param decisionId The ID of the decision.
     * @param pnlBps Realized profit (positive) or loss (negative) in basis points.
     */
    event OutcomeRecorded(
        uint256 indexed decisionId,
        int256 pnlBps
    );

    /**
     * @notice Emitted when the owner changes the authorized agent address.
     * @param previousAgent The previously authorized agent.
     * @param newAgent The newly authorized agent address.
     */
    event AgentUpdated(
        address indexed previousAgent,
        address indexed newAgent
    );

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * @notice Deploys the DecisionLog contract.
     * @param initialOwner The address that will own the contract (via OpenZeppelin Ownable).
     * @param initialAgent The address authorized to commit, reveal, and record outcomes.
     */
    constructor(address initialOwner, address initialAgent) Ownable(initialOwner) {
        require(initialAgent != address(0), "DecisionLog: zero agent address");
        authorizedAgent = initialAgent;
    }

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    /// @notice Reverts if the caller is not the authorized agent.
    modifier onlyAgent() {
        require(msg.sender == authorizedAgent, "DecisionLog: caller is not the agent");
        _;
    }

    // -------------------------------------------------------------------------
    // Write functions
    // -------------------------------------------------------------------------

    /**
     * @notice Commit a trading decision hash on-chain BEFORE executing the trade.
     *
     * The agent generates a full reasoning document, hashes it with keccak256,
     * and calls this function to timestamp the commitment on-chain. This proves
     * the reasoning existed BEFORE the trade was executed.
     *
     * @param decisionHash keccak256 of the full reasoning text.
     * @param assetPair The trading pair, e.g. "ETH/USDC".
     * @param action The recommended action: 0=HOLD, 1=BUY, 2=SELL.
     * @param confidenceBps Confidence level in basis points (0–10000).
     * @return decisionId The sequential ID assigned to this decision.
     */
    function commitDecision(
        bytes32 decisionHash,
        string calldata assetPair,
        uint8 action,
        uint256 confidenceBps
    ) external onlyAgent returns (uint256 decisionId) {
        require(action <= ACTION_SELL, "DecisionLog: invalid action");
        require(confidenceBps <= MAX_CONFIDENCE_BPS, "DecisionLog: confidence exceeds 10000 bps");

        decisionId = decisionCount;

        _decisions[decisionId] = Decision({
            id: decisionId,
            agentAddr: msg.sender,
            decisionHash: decisionHash,
            assetPair: assetPair,
            action: action,
            confidenceBps: confidenceBps,
            timestamp: block.timestamp,
            revealed: false,
            outcomeRecorded: false,
            pnlBps: 0
        });

        _agentDecisionIds[msg.sender].push(decisionId);
        decisionCount++;

        emit DecisionCommitted(
            decisionId,
            msg.sender,
            decisionHash,
            assetPair,
            action,
            confidenceBps,
            block.timestamp
        );
    }

    /**
     * @notice Reveal the full reasoning text for a previously committed decision.
     *
     * The caller must provide the EXACT reasoning text whose keccak256 hash matches
     * the decisionHash stored at commit time. If the hashes don't match, the call
     * reverts — this is the core audit guarantee. The reasoning is emitted in an
     * event rather than stored, to keep gas costs low.
     *
     * @param decisionId The ID of the decision to reveal.
     * @param reasoningText The full plaintext reasoning document.
     */
    function revealReasoning(
        uint256 decisionId,
        string calldata reasoningText
    ) external onlyAgent {
        require(decisionId < decisionCount, "DecisionLog: decision not found");

        Decision storage d = _decisions[decisionId];
        require(!d.revealed, "DecisionLog: already revealed");
        require(
            keccak256(bytes(reasoningText)) == d.decisionHash,
            "DecisionLog: reasoning hash mismatch"
        );

        d.revealed = true;
        emit ReasoningRevealed(decisionId, reasoningText);
    }

    /**
     * @notice Record the realized PnL outcome for a past decision.
     *
     * Called after the trade has settled. The outcome is stored on-chain so the
     * agent's historical track record is fully auditable.
     *
     * @param decisionId The ID of the decision.
     * @param pnlBps Realized profit (positive) or loss (negative) in basis points.
     */
    function recordOutcome(
        uint256 decisionId,
        int256 pnlBps
    ) external onlyAgent {
        require(decisionId < decisionCount, "DecisionLog: decision not found");

        Decision storage d = _decisions[decisionId];
        require(!d.outcomeRecorded, "DecisionLog: outcome already recorded");

        d.pnlBps = pnlBps;
        d.outcomeRecorded = true;

        emit OutcomeRecorded(decisionId, pnlBps);
    }

    /**
     * @notice Change the authorized agent address. Only callable by the owner.
     * @param newAgent The new agent address. Must not be the zero address.
     */
    function setAgent(address newAgent) external onlyOwner {
        require(newAgent != address(0), "DecisionLog: zero agent address");
        emit AgentUpdated(authorizedAgent, newAgent);
        authorizedAgent = newAgent;
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    /**
     * @notice Retrieve a decision by its ID.
     * @param decisionId The sequential decision ID.
     * @return Decision memory struct with all fields except the reasoning text.
     */
    function getDecision(
        uint256 decisionId
    ) external view returns (Decision memory) {
        require(decisionId < decisionCount, "DecisionLog: decision not found");
        return _decisions[decisionId];
    }

    /**
     * @notice Returns a paginated list of decision IDs for a given agent.
     * @param agentAddr The agent address to query.
     * @param offset The number of entries to skip (0-based).
     * @param limit The maximum number of entries to return.
     * @return ids Array of decision IDs.
     * @return total Total number of decisions by this agent (useful for pagination).
     */
    function getDecisionIdsByAgent(
        address agentAddr,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory ids, uint256 total) {
        uint256[] storage allIds = _agentDecisionIds[agentAddr];
        total = allIds.length;

        uint256 end = offset + limit;
        if (end > total) end = total;
        if (offset >= total) return (new uint256[](0), total);

        uint256 resultLen = end - offset;
        ids = new uint256[](resultLen);
        for (uint256 i = 0; i < resultLen; i++) {
            ids[i] = allIds[offset + i];
        }
    }

    /**
     * @notice Returns the total number of decisions made by a specific agent.
     * @param agentAddr The agent address to query.
     * @return count The number of decisions committed by this agent.
     */
    function getAgentDecisionCount(
        address agentAddr
    ) external view returns (uint256 count) {
        count = _agentDecisionIds[agentAddr].length;
    }
}
