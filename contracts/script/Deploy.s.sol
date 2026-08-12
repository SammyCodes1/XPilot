// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DecisionLog.sol";
import "../src/CopilotRegistry.sol";

/**
 * @title Deploy XPilot Contracts
 * @notice Deploys DecisionLog and CopilotRegistry to X Layer.
 *
 * Environment variables required:
 *   PRIVATE_KEY  — Private key of the deployer (also set as owner and initial agent).
 *
 * Usage (testnet):
 *   forge script script/Deploy.s.sol --rpc-url xlayer_testnet --broadcast
 *
 * Usage (mainnet):
 *   forge script script/Deploy.s.sol --rpc-url xlayer --broadcast --verify
 */
contract Deploy is Script {
    function run() external {
        string memory pkStr = vm.envString("PRIVATE_KEY");
        // Add 0x prefix if the user omitted it (Foundry requires it for parseUint).
        bytes memory pkBytes = bytes(pkStr);
        if (pkBytes.length == 0 || pkBytes[0] != "0") {
            pkStr = string(abi.encodePacked("0x", pkStr));
        }
        uint256 deployerPrivateKey = vm.parseUint(pkStr);
        address deployer = vm.addr(deployerPrivateKey);

        // The deployer will be both the contract owner and the initial authorized agent.
        // In production you may want separate addresses for these roles.
        address contractOwner = deployer;
        address initialAgent = deployer;

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy DecisionLog
        DecisionLog decisionLog = new DecisionLog(contractOwner, initialAgent);
        console.log("DecisionLog deployed at:", address(decisionLog));

        // 2. Deploy CopilotRegistry
        CopilotRegistry copilotRegistry = new CopilotRegistry(contractOwner);
        console.log("CopilotRegistry deployed at:", address(copilotRegistry));

        // 3. Register the initial agent in the registry
        copilotRegistry.registerAgent(initialAgent, "XPilot Agent", "ipfs://");
        console.log("Initial agent registered:", initialAgent);

        vm.stopBroadcast();

        // Summary
        console.log("--- Deployment Summary ---");
        console.log("Owner:", contractOwner);
        console.log("Agent:", initialAgent);
        console.log("DecisionLog:", address(decisionLog));
        console.log("CopilotRegistry:", address(copilotRegistry));
    }
}
