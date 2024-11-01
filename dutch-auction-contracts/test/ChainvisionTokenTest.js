const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChainvisionToken", function () {
    let ChainvisionToken;
    let chainvisionToken;
    let owner;
    let bidder1;
    let bidder2;

    beforeEach(async function () {
        [owner, bidder1, bidder2] = await ethers.getSigners();
        ChainvisionToken = await ethers.getContractFactory("ChainvisionToken");
        chainvisionToken = await ChainvisionToken.deploy();
        await chainvisionToken.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await chainvisionToken.owner()).to.equal(await owner.getAddress());
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await chainvisionToken.balanceOf(await owner.getAddress());
            expect(await chainvisionToken.totalSupply()).to.equal(ownerBalance);
        });

        it("Should set the correct token name and symbol", async function () {
            expect(await chainvisionToken.name()).to.equal("ChainvisionToken");
            expect(await chainvisionToken.symbol()).to.equal("CVN");
        });
    });

    describe("Minting", function () {
        it("Should allow the owner to mint tokens", async function () {
            const mintBaseAmount = BigInt(100);
            const mintAmount = ethers.parseEther("100");
            await chainvisionToken.connect(owner).mintTokens(bidder1.getAddress(), mintBaseAmount);
            expect(await chainvisionToken.balanceOf(bidder1.getAddress())).to.equal(mintAmount);
        });

        it("Should increase total supply when minting", async function () {
            const initialSupply = await chainvisionToken.totalSupply();
            const mintBaseAmount = BigInt(100);
            const mintAmount = ethers.parseEther("100");
            await chainvisionToken.connect(owner).mintTokens(bidder1.getAddress(), mintBaseAmount);
            expect(await chainvisionToken.totalSupply()).to.equal(initialSupply + mintAmount);
        });

        it("Should emit Transfer event when minting", async function () {
            const mintBaseAmount = BigInt(100);
            const mintAmount = ethers.parseEther("100");
            await expect(chainvisionToken.connect(owner).mintTokens(bidder1.getAddress(), mintBaseAmount))
                .to.emit(chainvisionToken, "Transfer")
                .withArgs(ethers.ZeroAddress, bidder1.getAddress(), mintAmount);
        });

        it("Should not allow non-owners to mint tokens", async function () {
            const mintBaseAmount = BigInt(100);
            const mintAmount = ethers.parseEther("100");
            await expect(chainvisionToken.connect(bidder1).mintTokens(bidder2.getAddress(), mintBaseAmount))
                .to.be.revertedWithCustomError(chainvisionToken, "OwnableUnauthorizedAccount");
        });
    });

    describe("Burning", function () {
        const initialBaseMint = BigInt(1000);
        const initialMint = ethers.parseEther("1000");
        beforeEach(async function () {
            await chainvisionToken.connect(owner).mintTokens(bidder1.getAddress(), initialBaseMint);
        });

        it("Should allow the owner to burn tokens", async function () {
            const burnAmount = ethers.parseEther("100");
            await chainvisionToken.connect(owner).burnTokens(bidder1.getAddress(), burnAmount);
            expect(await chainvisionToken.balanceOf(bidder1.getAddress())).to.equal(initialMint - burnAmount);
        });

        it("Should decrease total supply when burning", async function () {
            const initialSupply = await chainvisionToken.totalSupply();
            const burnAmount = ethers.parseEther("100");
            await chainvisionToken.connect(owner).burnTokens(bidder1.getAddress(), burnAmount);
            expect(await chainvisionToken.totalSupply()).to.equal(initialSupply - burnAmount);
        });

        it("Should emit Transfer event when burning", async function () {
            const burnAmount = ethers.parseEther("100");
            await expect(chainvisionToken.connect(owner).burnTokens(bidder1.getAddress(), burnAmount))
                .to.emit(chainvisionToken, "Transfer")
                .withArgs(bidder1.getAddress(), ethers.ZeroAddress, burnAmount);
        });

        it("Should not allow non-owners to burn tokens", async function () {
            const burnAmount = ethers.parseEther("100");
            await expect(chainvisionToken.connect(bidder1).burnTokens(bidder2.getAddress(), burnAmount))
                .to.be.revertedWithCustomError(chainvisionToken, "OwnableUnauthorizedAccount");
        });

        it("Should revert when trying to burn more tokens than an account has", async function () {
            const excessiveBurnAmount = initialMint + ethers.parseEther("1");
            await expect(chainvisionToken.connect(owner).burnTokens(bidder1.getAddress(), excessiveBurnAmount))
                .to.be.revertedWithCustomError(chainvisionToken, "ERC20InsufficientBalance");
        });
    });

    describe("Transfers", function () {
        const initialBaseMint = BigInt(1000);
        const initialMint = ethers.parseEther("1000");

        beforeEach(async function () {
            await chainvisionToken.connect(owner).mintTokens(bidder1.getAddress(), initialBaseMint);
        });

        it("Should transfer tokens between accounts", async function () {
            const transferAmount = ethers.parseEther("100");
            await chainvisionToken.connect(bidder1).transfer(bidder2.getAddress(), transferAmount);
            expect(await chainvisionToken.balanceOf(bidder2.getAddress())).to.equal(transferAmount);
            expect(await chainvisionToken.balanceOf(bidder1.getAddress())).to.equal(initialMint - transferAmount);
        });

        it("Should emit Transfer event when transferring", async function () {
            const transferAmount = ethers.parseEther("100");
            await expect(chainvisionToken.connect(bidder1).transfer(bidder2.getAddress(), transferAmount))
                .to.emit(chainvisionToken, "Transfer")
                .withArgs(bidder1.getAddress(), bidder2.getAddress(), transferAmount);
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const excessiveAmount = initialMint + ethers.parseEther("1");
            await expect(chainvisionToken.connect(bidder1).transfer(bidder2.getAddress(), excessiveAmount))
                .to.be.revertedWithCustomError(chainvisionToken, "ERC20InsufficientBalance");
        });
    });

    describe("Allowances", function () {
        const initialBaseMint = BigInt(1000);
        const initialMint = ethers.parseEther("1000");

        beforeEach(async function () {
            await chainvisionToken.connect(owner).mintTokens(bidder1.getAddress(), initialBaseMint);
        });

        it("Should update allowances on approval", async function () {
            const approvalAmount = ethers.parseEther("100");
            await chainvisionToken.connect(bidder1).approve(bidder2.getAddress(), approvalAmount);
            expect(await chainvisionToken.allowance(bidder1.getAddress(), bidder2.getAddress())).to.equal(approvalAmount);
        });

        it("Should emit Approval event when approving", async function () {
            const approvalAmount = ethers.parseEther("100");
            await expect(chainvisionToken.connect(bidder1).approve(bidder2.getAddress(), approvalAmount))
                .to.emit(chainvisionToken, "Approval")
                .withArgs(bidder1.getAddress(), bidder2.getAddress(), approvalAmount);
        });

        it("Should allow transferFrom within allowance", async function () {
            const approvalAmount = ethers.parseEther("100");
            await chainvisionToken.connect(bidder1).approve(bidder2.getAddress(), approvalAmount);
            await chainvisionToken.connect(bidder2).transferFrom(bidder1.getAddress(), bidder2.getAddress(), approvalAmount);
            expect(await chainvisionToken.balanceOf(bidder2.getAddress())).to.equal(approvalAmount);
        });

        it("Should fail transferFrom if trying to transfer more than allowance", async function () {
            const approvalAmount = ethers.parseEther("100");
            const transferAmount = ethers.parseEther("101");
            await chainvisionToken.connect(bidder1).approve(bidder2.getAddress(), approvalAmount);
            await expect(chainvisionToken.connect(bidder2).transferFrom(bidder1.getAddress(), bidder2.getAddress(), transferAmount))
                .to.be.revertedWithCustomError(chainvisionToken, "ERC20InsufficientAllowance");
        });
    });
});