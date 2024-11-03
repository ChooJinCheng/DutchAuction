const hre = require("hardhat");

async function main() {
    const [owner, bidder1, bidder2] = await hre.ethers.getSigners();

    // Get the deployed contract
    const DutchAuction = await hre.ethers.getContractFactory("DutchAuction");
    const dutchAuction = await DutchAuction.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

    console.log("DutchAuction address:", await dutchAuction.getAddress());

    const ownerAddress = await dutchAuction.getOwner();
    console.log("Owner's address:", ownerAddress);
    console.log("Current signer address:", owner.address);

    // Start the auction as the owner
    const auctionDuration = 3600;
    await dutchAuction.connect(owner).startAuction(auctionDuration);
    console.log("Auction started by owner");

    // Get remaining time
    let remainingTime = await dutchAuction.getRemainingTime();
    console.log("Remaining time:", remainingTime.toString(), "seconds");

    // Place a bid as bidder1
    const bidAmount = hre.ethers.parseEther("10");
    await dutchAuction.connect(bidder1).bid({ value: bidAmount });
    console.log("Bid placed by bidder1");

    // Get remaining time again
    remainingTime = await dutchAuction.getRemainingTime();
    console.log("Remaining time after bid:", remainingTime.toString(), "seconds");

    // Try to bid as bidder2 after auction ends
    await hre.network.provider.send("evm_increaseTime", [3601]);
    await hre.network.provider.send("evm_mine");

    try {
        await dutchAuction.connect(bidder2).bid({ value: bidAmount });
    } catch (error) {
        console.log("Bidding after auction end failed as expected");
    }

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});