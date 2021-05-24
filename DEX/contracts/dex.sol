pragma solidity 0.8.0;
//pragma experimental ABIEncoderV2;
//standard feature since solc v0.8.0: ABI coder v2 is activated by default.

import "./wallet.sol";

contract Dex is Wallet {
    using SafeMath for uint256;

    enum Side {
        BUY, //0
        SELL //1
    }

    struct Order {
        uint256 id;
        Side side;
        address trader;
        bytes32 ticker;
        uint256 amount;
        uint256 price;
    }
    uint256 nextOrderId;
    //an actual orderbook split into bids and asks
    // need one orderbook for each assets
    // assets => mapping(BUY/SELL => Order[])
    mapping(bytes32 => mapping(uint256 => Order[])) orderbook;

    function getOrderBook(bytes32 ticker, Side side)
        public
        view
        returns (Order[] memory)
    {
        return orderbook[ticker][uint256(side)]; // getOrderBook(bytes32("LINK", Side.BUY))
    }

    function createLimitOrder(
        Side side,
        bytes32 ticker,
        uint256 amount,
        uint256 price
    ) public {
        if (side == Side.BUY) {
            require(balances[msg.sender]["ETH"] >= price.mul(amount));
        } else if (side == Side.SELL) {
            require(balances[msg.sender][ticker] >= amount);
        }

        Order[] storage orders = orderbook[ticker][uint256(side)];
        orders.push(
            Order(nextOrderId, side, msg.sender, ticker, amount, price)
        );
        //bubbleSort

        if (side == Side.BUY) {
            uint256 i = orders.length - 2;
            while (orders[orders.length - 1].price > orders[i].price && i > 0) {
                Order memory left = orders[i];
                orders[i] = orders[orders.length - 1];
                orders[orders.length - 1] = left;
                i--;
            }
        } else if (side == Side.SELL) {
            uint256 i = orders.length - 2;
            while (orders[orders.length - 1].price < orders[i].price && i > 0) {
                Order memory left = orders[i];
                orders[i] = orders[orders.length - 1];
                orders[orders.length - 1] = left;
                i--;
            }
        }

        nextOrderId++;
    }
}
