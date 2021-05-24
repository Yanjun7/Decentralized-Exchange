pragma solidity 0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract MyToken is ERC20Capped {
    constructor() ERC20Capped(10000) ERC20("YJToken", "YJT") {
        //the ERC20 we inherent has its constructor implementation, so here
        //we only need to call the constructor and supply the argiment
        _mint(msg.sender, 1000);
    }
}
