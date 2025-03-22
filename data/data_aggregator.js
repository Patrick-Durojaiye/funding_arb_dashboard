const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { calculateArbitrage } = require('./funding_arb_model');

// Store latest data from both sources
const hyperliquidData = new Map();
const lighterData = new Map();

// Load market symbols mapping
let marketSymbols = {};
try {
    const rawData = fs.readFileSync(path.join(__dirname, 'market_symbols.json'));
    marketSymbols = JSON.parse(rawData);
    console.log("[AGGREGATOR] Loaded market symbols:", marketSymbols);
} catch (error) {
    console.error("[AGGREGATOR] Error loading market symbols:", error);
}

// Track last UI update
let lastUiUpdate = 0;
const UI_UPDATE_INTERVAL = 60000; // 1 minute in milliseconds

// Function to check for arbitrage opportunities
const checkArbitrageOpportunities = () => {
    console.log("[AGGREGATOR] Checking for arbitrage opportunities...");
    
    const now = Date.now();
    if (now - lastUiUpdate < UI_UPDATE_INTERVAL) {
        console.log("[AGGREGATOR] Skipping UI update - too soon since last update");
        return;
    }
    
    console.log("[AGGREGATOR] Current Hyperliquid data:", [...hyperliquidData.entries()]);
    console.log("[AGGREGATOR] Current Lighter data:", [...lighterData.entries()]);

    for (const [symbol, hyperliquidInfo] of hyperliquidData) {
        const lighterInfo = lighterData.get(symbol);
        if (lighterInfo) {
            console.log(`[AGGREGATOR] Found matching data for symbol ${symbol}`);
            console.log(`[AGGREGATOR] Hyperliquid funding rate: ${hyperliquidInfo.funding}`);
            console.log(`[AGGREGATOR] Lighter funding rate: ${lighterInfo.funding_rate}`);

            const arbitrageResult = calculateArbitrage(
                300000, // Default position size
                hyperliquidInfo.funding,
                lighterInfo.funding_rate,
                0.01, // Maker fee
                0.035 // Taker fee
            );

            if (arbitrageResult) {
                console.log(`[AGGREGATOR] Found arbitrage opportunity for ${symbol}:`, arbitrageResult);
                
                if (global.io) {
                    console.log("[AGGREGATOR] Emitting arbitrage opportunity to frontend");
                    global.io.emit('arbitrageOpportunity', {
                        symbol,
                        timestamp: new Date().toISOString(),
                        hyperliquidData: hyperliquidInfo,
                        lighterData: lighterInfo,
                        arbitrageResult
                    });
                } else {
                    console.error("[AGGREGATOR] Socket.io instance not found!");
                }
            } else {
                console.log(`[AGGREGATOR] No profitable arbitrage found for ${symbol}`);
            }
        } else {
            console.log(`[AGGREGATOR] No matching Lighter data found for symbol ${symbol}`);
        }
    }
    
    lastUiUpdate = now;
};

// Export the data maps and check function
module.exports = {
    hyperliquidData,
    lighterData,
    checkArbitrageOpportunities
}; 