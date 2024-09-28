// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChainvisionToken is ERC20, Ownable {
    constructor() ERC20("ChainvisionToken", "CVN") Ownable(msg.sender) {}

    function mintTokens(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burnTokens(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
