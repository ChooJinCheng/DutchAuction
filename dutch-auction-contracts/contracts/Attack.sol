// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./DutchAuction.sol";

contract ReentrancyAttack is Ownable {
    DutchAuction public immutable dutchAuction;
    uint public attackCount;
    bool public attackMode = false;
    bool public isFinalizeTestOrRefundTest;

    constructor(address payable _dutchAuctionAddress) Ownable(msg.sender) {
        dutchAuction = DutchAuction(_dutchAuctionAddress);
    }

    function participateInAuction() external payable {
        dutchAuction.bid{value: msg.value}();
    }

    function attemptToFinalizeAuction() external {
        dutchAuction.finalizeAuction();
    }

    function withdrawTokens() external {
        dutchAuction.withdrawTokens();
    }

    function enableFinalizeMode() external {
        isFinalizeTestOrRefundTest = true;
    }

    function enableRefundMode() external {
        isFinalizeTestOrRefundTest = false;
    }

    function enableAttackMode() external {
        attackMode = true;
    }

    function attemptRefundReentrancy(uint amount) external {
        dutchAuction.refundAmountPublic(address(this), amount);
    }

    // Fallback function to attempt reentrancy
    receive() external payable {
        if (attackMode && attackCount < 5) {
            attackCount++;
            // Attempt to call function again
            if (isFinalizeTestOrRefundTest) {
                try dutchAuction.finalizeAuction() {} catch {
                    //Function call is reverted
                }
            } else {
                try
                    dutchAuction.refundAmountPublic(address(this), 1 ether)
                {} catch {
                    //Function call is reverted
                }
            }
        }
    }
}
