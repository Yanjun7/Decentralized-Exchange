// The user must have ETH deposited such that deposited ETH >= buy order value
// The user must have token deposited such that deposited token >= sell order amount
// The BUY order book should be ordered on price from the highest to the lowest starting at index 0
const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")

const truffleAssert = require("truffle-assertions")


contract("Dex-market-order", accounts=>{
    //To create a SELL market order, the user must have token deposited such that deposited token >= sell order amount"
    it("Should throw an error when creating a sell market order without adequate token balance", async()=>{
        let dex = await Dex.deployed()
        let balance = await dex.getBalance(accounts[0], web3.utils.fromUtf8("LINK"))
        //console.log(balance.toNumber())
        assert.equal(balance.toNumber(),0, "Initial balance is not zero")

        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"),10)
        )        
    })
    
    it("BUY orders can be submited even when BUY order book is empty", async()=>{
        let dex = await Dex.deployed()
        await dex.depositEth({value: 10000})
        let buyBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0) // get buy side orderbook
        assert.equal(buyBook.length, 0, "Buy book is not empty")
        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"),20)
        ) 
    })

    //If there is enough liquidity in the order book, market sell orders should be filled until the market order is 100% filled
    it("Market orders should not be filled more limit orders than matket orders", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        let sellBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1) // get sell side orderbook
        assert.equal(sellBook.length, 0, "sell book is not empty initailly")
        dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        //transfer from accounst[0] to accounts[1],accounts[2],accounts[3] 
        await link.transfer(accounts[1],500)
        await link.transfer(accounts[2],500)
        await link.transfer(accounts[3],500)

        //approve DEX for accounts[1],accounts[2],accounts[3]
        await link.approve(dex.address, 150, {from:accounts[1]})  
        await link.approve(dex.address, 150, {from:accounts[2]})
        await link.approve(dex.address, 150, {from:accounts[3]})

        //Deposit DEX to accounts[1],accounts[2],accounts[3]
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from:accounts[1]})
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from:accounts[2]})
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from:accounts[3]})

        //fill up the sell order
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),5,300,{from:accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),5,400,{from:accounts[2]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),5,500,{from:accounts[3]})
       
        //create a market order that should fill up 2/3 orders in the book
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"),10)

        //get sell order book
        sellBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
    
        assert(sellBook.length==1, "Sell book should only have one order left")
        assert(sellBook[0].filled == 0, "Sell side should have 0 filled")
    })
    //If there is enough liquidity in the order book, market sell orders should be filled until the market order is 100% filled
    it("Market orders should be 100% filled untill the order book is empty", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        let sellBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
        assert(sellBook.length==1, "should only have one order left from the previous test")
        //fill up the order book again
        await link.approve(dex.address, 500, { from: accounts[1] })
        await link.approve(dex.address, 500, { from: accounts[2] })
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[1] })
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from:accounts[2]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),5,300,{from:accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),5,400,{from:accounts[2]})

        //check buyer link balance before link purchase
        let balanceBefore = await dex.getBalance(accounts[0], web3.utils.fromUtf8("LINK"));

        //create a market buy order that ask for more than the entire market sell book (15 LINK)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"),50)

        //check buyer link balance after link purchase
        let balanceAfter = await dex.getBalance(accounts[0], web3.utils.fromUtf8("LINK"));

        //buyer should have 15 more LINK after purchase even the buy order specified 50 LINK
        assert.equal(balanceBefore.toNumber()+15,balanceAfter.toNumber())
    })

    it("The ETH balance of the buyer should decrease with the filled amounts.", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        //seller (accounts[1]) deposit link and sell it for 300 wei (limit order)
        await link.approve(dex.address, 500, { from: accounts[1] })
    
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from:accounts[1]})

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),1,300, {from:accounts[1]})

        //check buyer ETH balance before trade
        let balanceBefore = await dex.getBalance(accounts[0], web3.utils.fromUtf8("ETH"));
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"),1)
        let balanceAfter = await dex.getBalance(accounts[0], web3.utils.fromUtf8("ETH"));

        //buyer should have 300 less ETH after purchase 
        assert.equal(balanceBefore.toNumber()-300,balanceAfter.toNumber())

    })
    xit("The token balance(s) of the token sell(s) should decrease with the filled amounts.", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        
        let sellBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1) // get sell side orderbook
        assert(sellBook.length == 0, "sell book is not empty initailly")
        
        
        //seller account[2] approve and deposit LINK
        await link.approve(dex.address, 500, {from:accounts[2]})
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), { from: accounts[2] })
        await link.approve(dex.address, 500, {from:accounts[1]})
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from:accounts[1]})

        //fill up the sell order
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),1,300,{from:accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"),1,400,{from:accounts[2]})

        //check sellers's LINK balances before trade
        let account1BalanceBefore = await dex.getBalance(accounts[1], web3.utils.fromUtf8("LINK"));
        let account2BalanceBefore = await dex.getBalance(accounts[2], web3.utils.fromUtf8("LINK"));

        //accounts[1] created market order to buy up both sellers
        await dex.depositEth({value: 10000})
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"),2)

       //check sellers's LINK balances after trade
       let account1BalanceAfter = await dex.getBalance(accounts[1], web3.utils.fromUtf8("LINK"));
       let account2BalanceAfter = await dex.getBalance(accounts[2], web3.utils.fromUtf8("LINK"));

       assert.equal(account1BalanceBefore.toNumber()-1,account1BalanceAfter.toNumber())
       assert.equal(account2BalanceBefore.toNumber()-1,account2BalanceAfter.toNumber())
    })

    xit("Filled limit orders should be removed from the order book", async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        //Seller deposit link and creates a sell order for 1 link for 300wei
        await link.approve(dex.address, 500)
        await dex.deposit(50, web3.utils.fromUtf8("LINK"))
        await dex.depositEth({value: 10000})

        let orders = dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1) //get sell side book
        await dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 1, 300)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"),1) // accounts[0]

        orders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1) //get sell side book
        assert(orders.length==0, "sell book isn't empty after trade")
    })
    //Limit orders filled propert should be set properly after a trade
    xit("Partially filled limit orders should be modified to present the filled/remaining amount", async()=>{
        let dex = await Dex.deployed()
    
        let orders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1) //get sell side book
        assert(orders.length==0, "sell book isn't empty initially")

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, { from: accounts[1] })
        await dex.depositEth({value:1000})
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"),2) // accounts[0]

        orders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1) //get sell side book
        assert.equal(orders[0].filled, 2 ,"2/5 order should be filled")
        assert.equal(orders[0].amount, 5 ,"initial amount should be 5")
        // available = amount - filled
    })
    //When creating a BUY market order, the buyer needs to have enough ETH for the trade
    it("Should throw an error when creating a buy market order without adequate ETH balance", async () => {
        let dex = await Dex.deployed()
        
        let balance = await dex.balances(accounts[4], web3.utils.fromUtf8("ETH"))
        assert.equal( balance.toNumber(), 0, "Initial ETH balance is not 0" );
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})

        await truffleAssert.reverts(
            
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 5, {from: accounts[4]})
        )
    })
    
}) 
