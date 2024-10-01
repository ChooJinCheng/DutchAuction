const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DutchAuction Reentrancy Resistance", function () {
    let dutchAuction, reentrancyAttack, owner, attacker;

    beforeEach(async function () {
        [owner, attacker] = await ethers.getSigners();

        //Deployment of DutchAuction contract
        const DutchAuction = await ethers.getContractFactory("DutchAuction");
        dutchAuction = await DutchAuction.deploy(ethers.parseEther("1"), 100);
        await dutchAuction.waitForDeployment();

        //Deployment of Attackers contract
        const ReentrancyAttack = await ethers.getContractFactory("ReentrancyAttack");
        reentrancyAttack = await ReentrancyAttack.connect(attacker).deploy(await dutchAuction.getAddress());
        await reentrancyAttack.waitForDeployment();

        // Start the auction
        await dutchAuction.connect(owner).startAuction(1200);
    });

    it("should be resistant to reentrancy attacks during finalization", async function () {
        // Participate in the auction with more ETH than necessary to ensure a refund
        await reentrancyAttack.connect(attacker).participateInAuction({ value: ethers.parseEther("10") });

        // Enable relevant attack modes
        await reentrancyAttack.connect(attacker).enableAttackMode();
        await reentrancyAttack.connect(attacker).enableFinalizeMode();

        await ethers.provider.send("evm_increaseTime", [1201]);
        await ethers.provider.send("evm_mine");

        // Finalize the auction, which should trigger the refund and attempt reentrancy through finalize auction to obtain more refunds
        await dutchAuction.connect(owner).finalizeAuction();

        // Check that the attack count didn't increase beyond 1 since fallback function will only trigger once
        expect(await reentrancyAttack.attackCount()).to.equal(1);

        // Verify that the auction finalized
        expect(await dutchAuction.isAuctionActive()).to.be.false;

        // Attempt to finalize again, however auction should be inactive
        await expect(reentrancyAttack.connect(attacker).attemptToFinalizeAuction())
            .to.be.revertedWith("Auction is not active");
    });

    //Since token is directly minted to bidder's address, reentrancy is not possible in this case
    it("should allow normal token withdrawal after auction", async function () {
        //Attack participate in auction
        await reentrancyAttack.connect(attacker).participateInAuction({ value: ethers.parseEther("1") });

        await ethers.provider.send("evm_increaseTime", [1201]);
        await ethers.provider.send("evm_mine");

        await dutchAuction.connect(owner).finalizeAuction();

        // Attempt to withdraw tokens using attacker's contract
        await expect(reentrancyAttack.connect(attacker).withdrawTokens())
            .to.not.be.reverted;

        // Check that tokens were minted to the attacker's contract address
        const reentrancyAttackAddress = await reentrancyAttack.getAddress();
        const tokenAddress = await dutchAuction.token();
        const ChainvisionToken = await ethers.getContractFactory("ChainvisionToken");
        const token = ChainvisionToken.attach(tokenAddress);
        expect(await token.balanceOf(reentrancyAttackAddress)).to.be.gt(0);
    });

    //refundAmountPublic function is created purely to showcase the effectivness of OpenZepplin's reentrancy guard
    it("should be resistant to reentrancy attacks on refundAmountPublic", async function () {
        //Fund DutchAuction contract to hold certain eth amount
        await owner.sendTransaction({
            to: await dutchAuction.getAddress(),
            value: ethers.parseEther("10")
        });

        // Enable relevant attack mode
        await reentrancyAttack.connect(attacker).enableAttackMode();
        await reentrancyAttack.connect(attacker).enableRefundMode();

        // Initial balance of the attack contract before attack
        const initialBalance = await ethers.provider.getBalance(await reentrancyAttack.getAddress());

        // Attempt reentrancy attack on refundAmountPublic
        await reentrancyAttack.connect(attacker).attemptRefundReentrancy(ethers.parseEther("1"));

        // Final balance of the attack contract after reentrancy attack
        const finalBalance = await ethers.provider.getBalance(await reentrancyAttack.getAddress());

        // Check that the attack count didn't increase beyond 1 since fallback function will only trigger once
        expect(await reentrancyAttack.attackCount()).to.equal(1);

        // Check that the balance only increased by the amount of one refund
        expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1"));
    });
});