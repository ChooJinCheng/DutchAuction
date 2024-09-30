const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DutchAuction", function () {
    let DutchAuction;
    let dutchAuction;
    let tokenAddress;
    let owner;
    let bidder1;
    let bidder2;
    let bidder3;

    beforeEach(async function () {
        [owner, bidder1, bidder2, bidder3] = await ethers.getSigners();
        DutchAuction = await ethers.getContractFactory("DutchAuction");
        dutchAuction = await DutchAuction.connect(owner).deploy(ethers.parseEther("1"), 100);
        await dutchAuction.waitForDeployment();

        tokenAddress = await dutchAuction.token();
    });

    describe("Deployment", function () {
        it("should deploy the DutchAuction contract and ChainvisionToken contract", async function () {
            let dutchAuctionAddr = await dutchAuction.getAddress();
            expect(dutchAuctionAddr).to.be.properAddress;
            expect(await ethers.provider.getCode(dutchAuctionAddr)).to.not.equal('0x');

            expect(tokenAddress).to.be.properAddress;
            expect(await ethers.provider.getCode(tokenAddress)).to.not.equal('0x');
        });
    });

    describe("Start Auction", function () {
        it("should start auction", async function () {
            await expect(dutchAuction.startAuction(1200)).to.emit(dutchAuction, 'AuctionStarted');
            expect(await dutchAuction.isAuctionActive()).to.be.true;
        });

        it("should revert start auction when called by non owner", async function () {
            await expect(dutchAuction.connect(bidder1).startAuction(1200))
                .to.be.revertedWithCustomError(dutchAuction, "OwnableUnauthorizedAccount").withArgs(bidder1);
        });

        it("should revert start auction given duration less than 60s", async function () {
            await expect(dutchAuction.connect(owner).startAuction(59))
                .to.be.revertedWith("Minimum duration is 60");
        });

        it("should revert start auction when there is already an ongoing auction", async function () {
            await dutchAuction.startAuction(1200);
            await expect(dutchAuction.connect(owner).startAuction(1200))
                .to.be.revertedWith("Auction is still active");
        });
    });

    describe("Finalizing Auction", function () {
        it("should finalize auction even with 0 bidder", async function () {
            await dutchAuction.startAuction(1200);
            await network.provider.send("evm_increaseTime", [1200]);
            await network.provider.send("evm_mine");
            await expect(dutchAuction.connect(owner).finalizeAuction())
                .to.emit(dutchAuction, 'AuctionEnded');
        });

        it("should finalize auction that has bidder bidding 0 amount", async function () {
            await dutchAuction.startAuction(1200);
            const bid1Amount = ethers.parseEther("0");
            await dutchAuction.connect(bidder1).bid({ value: bid1Amount });
            await network.provider.send("evm_increaseTime", [1200]);
            await network.provider.send("evm_mine");
            await expect(dutchAuction.connect(owner).finalizeAuction())
                .to.emit(dutchAuction, 'AuctionEnded');
        });

        it("should finalize auction and provide full refund for overbidders", async function () {
            await dutchAuction.startAuction(1200);
            //20eth gets 20 token at 1eth/token, 44token 0.45/token
            const bid1Amount = ethers.parseEther("20");
            await dutchAuction.connect(bidder1).bid({ value: bid1Amount });
            await network.provider.send("evm_increaseTime", [300]);
            await network.provider.send("evm_mine");

            //35eth gets 46 token at 0.75eth/token, 77 0.45/token
            const bid2Amount = ethers.parseEther("35");
            await dutchAuction.connect(bidder2).bid({ value: bid2Amount });
            await network.provider.send("evm_increaseTime", [360]);
            await network.provider.send("evm_mine");

            //14eth gets 31 token at 0.45eth/token
            const bid3Amount = ethers.parseEther("14");
            await dutchAuction.connect(bidder3).bid({ value: bid3Amount });
            await network.provider.send("evm_increaseTime", [540]);
            await network.provider.send("evm_mine");

            await expect(dutchAuction.connect(owner).finalizeAuction())
                .to.emit(dutchAuction, 'TokensReserved')
                .to.emit(dutchAuction, 'RefundAmount')
                .to.emit(dutchAuction, 'TokensReserved')
                .to.emit(dutchAuction, 'RefundAmount')
                .to.emit(dutchAuction, 'RefundAmount').withArgs(bidder3, bid3Amount)
                .to.emit(dutchAuction, 'AuctionEnded');
        });

        it("should revert finalize auction when auction is running and supply has yet to deplete", async function () {
            await dutchAuction.startAuction(1200);
            await expect(dutchAuction.connect(owner).finalizeAuction())
                .to.revertedWith("Auction duration has not passed or tokens still remain");
        });

        it("should revert finalize auction when auction has yet to start", async function () {
            await expect(dutchAuction.connect(owner).finalizeAuction())
                .to.revertedWith("Auction is not active");
        });

        it("should revert finalize auction when non-owner or non-internal call", async function () {
            await dutchAuction.startAuction(1200);
            await expect(dutchAuction.connect(bidder1).finalizeAuction())
                .to.revertedWith("You are not authorized to make this call");
        });
    });

    describe("Auction Bidding", function () {
        it("should allow bidding and store bid in queue", async function () {
            await dutchAuction.startAuction(1200);
            const bidAmount = ethers.parseEther("10");
            await expect(dutchAuction.connect(bidder1).bid({ value: bidAmount })).emit(dutchAuction, "BidSuccess");
            expect(await dutchAuction.getBidsQueueLength()).to.be.gt(0);
        });

        it("should allow bidding and finalize auction when remaining token supply = 0", async function () {
            await dutchAuction.startAuction(1200);
            //40eth gets 40 token at 1eth/token
            const bid1Amount = ethers.parseEther("40");
            await expect(dutchAuction.connect(bidder1).bid({ value: bid1Amount })).emit(dutchAuction, "BidSuccess");
            await network.provider.send("evm_increaseTime", [600]);
            await network.provider.send("evm_mine");
            //40eth gets 80 token at 0.5eth/token
            const bid2Amount = ethers.parseEther("40");
            await expect(dutchAuction.connect(bidder2).bid({ value: bid2Amount })).emit(dutchAuction, "AuctionEnded");
        });

        it("should revert bidding when there is no active auction", async function () {
            const bidAmount = ethers.parseEther("10");
            await expect(dutchAuction.connect(bidder1).bid({ value: bidAmount })).to.be.revertedWith("Auction is not active");
        });

        it("should revert bidding when auction is over but yet to be finalized", async function () {
            await dutchAuction.startAuction(1200);
            await network.provider.send("evm_increaseTime", [1200]);
            await network.provider.send("evm_mine");
            const bidAmount = ethers.parseEther("10");
            await expect(dutchAuction.connect(bidder1).bid({ value: bidAmount })).to.be.revertedWith("Auction has ended");
        });
    });

    describe("Tokens Withdrawal", function () {
        it("should allow bidder withdraw tokens", async function () {
            await dutchAuction.startAuction(1200);

            const bid1Amount = ethers.parseEther("20");
            await dutchAuction.connect(bidder1).bid({ value: bid1Amount });
            await network.provider.send("evm_increaseTime", [1200]);
            await network.provider.send("evm_mine");

            await expect(dutchAuction.connect(owner).finalizeAuction())
                .to.emit(dutchAuction, 'AuctionEnded');
            await expect(dutchAuction.connect(bidder1).withdrawTokens()).to.be.emit(dutchAuction, "TokensWithdrawn").withArgs(bidder1, 20);
        });

        it("should revert withdraw tokens if there is no tokens reserved", async function () {
            await expect(dutchAuction.connect(bidder1).withdrawTokens()).to.be.revertedWith("No reserved tokens to withdraw");
        });

        it("should revert withdraw tokens when there is an auction on-going", async function () {
            await dutchAuction.startAuction(1200);
            await expect(dutchAuction.connect(bidder1).withdrawTokens()).to.be.revertedWith("Auction is still active");
        });
    });

    describe("Owner Funds Withdrawal", function () {
        it("should allow owner to withdraw funds", async function () {
            const dutchAuctionAddress = await dutchAuction.getAddress();

            await owner.sendTransaction({
                to: dutchAuctionAddress,
                value: ethers.parseEther("1"),
            });

            const contractBalanceBefore = await ethers.provider.getBalance(dutchAuctionAddress);
            expect(contractBalanceBefore).to.be.equal(ethers.parseEther("1"));

            await dutchAuction.connect(owner).withdrawFunds();

            const contractBalanceAfter = await ethers.provider.getBalance(dutchAuctionAddress);
            expect(contractBalanceAfter).to.be.equal(0);
        });

        it("should revert withdraw funds when called by non-owner", async function () {
            await expect(dutchAuction.connect(bidder1).withdrawFunds()).to.be.revertedWithCustomError(dutchAuction, "OwnableUnauthorizedAccount").withArgs(bidder1);
        });
    });

    describe("Getter functions", function () {
        it("should correctly return auction status", async function () {
            const isActive = await dutchAuction.isAuctionActive();
            expect(isActive).to.be.false;
        });

        it("should return correct remaining time", async function () {
            await expect(dutchAuction.getRemainingTime()).to.be.revertedWith("Auction is not active");

            await dutchAuction.startAuction(1200);

            const remainingTime = await dutchAuction.getRemainingTime();
            expect(remainingTime).to.be.gt(0);
        });

        it("should return correct end time", async function () {
            await dutchAuction.startAuction(1200);

            const endTime = await dutchAuction.getEndTime();
            expect(endTime).to.be.gt(0);
        });

        it("should return correct start time", async function () {
            await dutchAuction.startAuction(1200);

            const startTime = await dutchAuction.getStartTime();
            expect(startTime).to.be.gt(0);
        });

        it("should return correct estimated remaining supply", async function () {
            const estRemainingSupply = await dutchAuction.getestRemainingSupply();
            expect(estRemainingSupply).to.be.gte(0);
        });

        it("should return correct reserved tokens for a bidder", async function () {
            const reservedTokens = await dutchAuction.connect(bidder1).getReservedToken();
            expect(reservedTokens).to.equal(0);
        });

        it("should return correct bids queue length", async function () {
            const queueLength = await dutchAuction.getBidsQueueLength();
            expect(queueLength).to.equal(0);
        });

        it("should return current timestamp", async function () {
            const currentTimestamp = await dutchAuction.getCurrentTimestamp();
            const blockTimestamp = await time.latest();
            expect(currentTimestamp).to.equal(blockTimestamp);
        });

        it("should trigger dummy block", async function () {
            const initialTimestamp = await dutchAuction.getCurrentTimestamp();
            await dutchAuction.triggerDummyBlock();
            const newTimestamp = await dutchAuction.getCurrentTimestamp();
            expect(newTimestamp).to.be.gt(initialTimestamp);
        });
    });
});