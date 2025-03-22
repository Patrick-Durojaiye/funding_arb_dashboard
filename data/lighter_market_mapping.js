const fs = require('fs');
const axios = require('axios');

const API_URL = "https://mainnet.zklighter.elliot.ai/api/v1/orderBooks";

async function fetchMarketSymbols() {
    try {
        const response = await axios.get(API_URL);
        if (response.data && response.data.order_books) {
            const marketSymbolMap = {};

            response.data.order_books.forEach((market) => {
                marketSymbolMap[market.market_id] = market.symbol;
            });

            // Save to a local JSON file
            fs.writeFileSync('market_symbols.json', JSON.stringify(marketSymbolMap, null, 2));
            console.log("Market symbol mapping saved successfully!");
        } else {
            console.error("Invalid response structure from API");
        }
    } catch (error) {
        console.error("Error fetching market symbols:", error);
    }
}

fetchMarketSymbols();
