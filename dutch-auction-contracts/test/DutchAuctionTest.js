const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DutchAuction", function () {
    let DutchAuction;
    let dutchAuction;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, bidder1, bidder2] = await ethers.getSigners();
        DutchAuction = await ethers.getContractFactory("DutchAuction");
        dutchAuction = await DutchAuction.deploy("1000000000000000000", 100);
        await dutchAuction.waitForDeployment();
    });

    it("Should deploy the DutchAuction contract", async function () {
        expect(await dutchAuction.getAddress()).to.be.properAddress;
        //expect(dutchAuction).to.be.instanceOf(ethers.Contract);
    });

    // Add more tests as needed
});