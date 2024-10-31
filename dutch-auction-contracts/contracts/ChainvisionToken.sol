// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChainvisionToken is ERC20, Ownable {
    constructor() ERC20("ChainvisionToken", "CVN") Ownable(msg.sender) {}

    // minted Token will be distributed by the contract owner only
    function mintTokens(address to, uint256 amount) external onlyOwner {
        _mint(to, amount * 10 ** decimals());
    }

    // unsold tokens will be burned away only by the contract owner
    function burnTokens(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
