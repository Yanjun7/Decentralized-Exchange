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
        uint256 filled;
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
            Order(nextOrderId, side, msg.sender, ticker, amount, price, 0)
        );
        // bubbleSort
        uint256 i = orders.length > 0 ? orders.length - 1 : 0;
        if (side == Side.BUY) {
            while (i > 0) {
                if (orders[i].price < orders[i - 1].price) {
                    break;
                }
                Order memory toBeMoved = orders[i - 1];
                orders[i - 1] = orders[i];
                orders[i] = toBeMoved;
                i--;
            }
        } else if (side == Side.SELL) {
            while (i > 0) {
                if (orders[i].price > orders[i - 1].price) {
                    break;
                }
                Order memory toBeMoved = orders[i - 1];
                orders[i - 1] = orders[i];
                orders[i] = toBeMoved;
                i--;
            }
        }
        nextOrderId++;
    }

    function createMarketOrder(
        Side side,
        bytes32 ticker,
        uint256 amount
    ) public {
        if (side == Side.SELL) {
            require(balances[msg.sender][ticker] >= amount);
        }
        //when there is a buy order, we need to get the sell order book to find matches, vice versa.
        uint256 orderBookSide;
        if (side == Side.BUY) {
            orderBookSide = 1;
        } else {
            orderBookSide = 0;
        }

        uint256 filledSoFar;
 
        Order[] storage orderBook = orderbook[ticker][orderBookSide]; //get opposit side of market book
        for (uint256 i = 0; i < orderBook.length && filledSoFar < amount; i++) {
            //how much we can fill from order[i]
            //update filledSoFar
            //excute the trade and shift balances from buyers and sellers
            // verify the buy have enough ETH to cover the purchases (can't know that at the beginning)
            uint leftToFill = amount.sub(filledSoFar); 
            uint availableToFill = orderBook[i].amount.sub(orderBook[i].filled); 
            uint filledForThisRun;
            if(leftToFill < availableToFill){
                filledForThisRun = leftToFill; // the current order is used for partially filled
                                                // entire market is 100% filled
            }else{ //leftToFill >= availableToFill
                filledForThisRun = availableToFill; //the current order is used for fully filled
                                                    // need to check the next order if any
            }
            filledSoFar = filledSoFar.add(filledForThisRun);
            orderBook[i].filled = orderBook[i].filled.add(filledForThisRun);
            uint cost = filledForThisRun.mul(orderBook[i].price);

            if(side == Side.BUY){
                require(balances[msg.sender]["ETH"] >= cost, "Insufficent funds");
                //transfer
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].sub(cost);
                balances[msg.sender][ticker] = balances[msg.sender][ticker].add(filledForThisRun);

                balances[orderBook[i].trader]["ETH"] = balances[msg.sender]["ETH"].add(cost);
                balances[orderBook[i].trader][ticker] = balances[msg.sender][ticker].sub(filledForThisRun);

            }else if(side == Side.SELL){
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].add(cost);
                balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(filledForThisRun);

                balances[orderBook[i].trader]["ETH"] = balances[msg.sender]["ETH"].sub(cost);
                balances[orderBook[i].trader][ticker] = balances[msg.sender][ticker].add(filledForThisRun);
            }
        }

        //remove 100% filled order from orderBook
        //filled orders are at the top unless all of them are filled
        while(orderBook.length > 0 && orderBook[0].filled == orderBook[0].amount){
            for (uint256 i = 0; i < orderBook.length-1; i++) {
                orderBook[i] = orderBook[i+1];
            }
            orderBook.pop();
        }
        
    }
}
