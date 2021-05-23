pragma solidity 0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract Wallet is Ownable {
    using SafeMath for uint256;

    struct Token {
        bytes32 ticker;
        address tokenAddress; //call token contracts in order to make transfer calls
    }
    mapping(bytes32 => Token) public tokenMapping; //in order to quickily search and update
    bytes32[] public tokenList; // in order to iterate

    mapping(address => mapping(bytes32 => uint256)) balances; // address=> tokenSymbol=> balances

    modifier isTokenExists(bytes32 ticker) {
        require(tokenMapping[ticker].tokenAddress != address(0));
        _;
    }

    function addToken(bytes32 ticker, address tokenAddress) external onlyOwner {
        tokenMapping[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }

    function deposit(bytes32 ticker, uint256 amount)
        external
        isTokenExists(ticker)
    {
        IERC20(tokenMapping[ticker].tokenAddress).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount);
    }

    function withdraw(bytes32 ticker, uint256 amount)
        external
        isTokenExists(ticker)
    {
        // from this contract to msg.sender
        // we just held the tokens for owners in this DEX

        // this function is interacting with actual token contract. in order to
        // trasfer tokens between the user's ownership and our contract's ownership
        // we need to interact with ERC token contract
        // to interact with another contract -- we need interface and address
        // --> what the contract looks like and where the contract is
        require( //check
            balances[msg.sender][ticker] >= amount,
            "insufficnient balance"
        );

        balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount); //effect
        IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount); //interact
        //we're interacting with the real token contract, transfer token fron that token contract
        //to the msg.sender who is the right owner
        //we are the DEX!!!
    }
}
