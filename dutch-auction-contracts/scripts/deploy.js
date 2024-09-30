const hre = require("hardhat");

async function main() {
    const DutchAuction = await hre.ethers.getContractFactory("DutchAuction");
    const dutchAuction = await DutchAuction.deploy("1000000000000000000", 100);

    await dutchAuction.waitForDeployment();

    console.log("DutchAuction deployed to:", await dutchAuction.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});