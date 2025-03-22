const calculateArbitrage = (positionSizeUSD, fundingRateHyperliquid, fundingRateLighter, makerFeeHyperliquid, takerFeeHyperliquid) => {

    let scenarios = [
        {hyperliquid: "Long", lighter: "Short", fundingDiff: -fundingRateHyperliquid - (-fundingRateLighter)},
        {hyperliquid: "Short", lighter: "Long", fundingDiff: fundingRateHyperliquid - fundingRateLighter}
    ];

    // Evaluate both scenarios
    let bestScenario = null;
    let highestAnnualYield = -Infinity;

    scenarios.forEach(({hyperliquid, lighter, fundingDiff}) => {

        const fundingProfitPerHour = (fundingDiff / 100) * positionSizeUSD;

        // Trading Fees
        const tradingFeesMaker = (positionSizeUSD/2) * (makerFeeHyperliquid / 100)*2;
        const tradingFeesTaker = (positionSizeUSD/2) * (takerFeeHyperliquid / 100)*2;

        // Net Profit Calculation
        const netProfitPerHourMaker = fundingProfitPerHour - tradingFeesMaker;
        const netProfitPerHourTaker = fundingProfitPerHour - tradingFeesTaker;

        // Breakeven Time
        const breakevenTimeMaker = tradingFeesMaker / fundingProfitPerHour;
        const breakevenTimeTaker = tradingFeesTaker / fundingProfitPerHour;

        // Daily Profit
        const netDailyProfitMaker = (24 - breakevenTimeMaker) * fundingProfitPerHour;
        const netDailyProfitTaker = (24 - breakevenTimeTaker) * fundingProfitPerHour;

        // Annual Percentage Yield (APY)
        const apyMarker = (netDailyProfitMaker / positionSizeUSD) * 365 * 100;
        const apyTaker = (netDailyProfitTaker / positionSizeUSD) * 365 * 100;

        const bestYield = Math.max(apyMarker, apyTaker);
        if (apyMarker > highestAnnualYield || apyTaker > highestAnnualYield) {
            highestAnnualYield = bestYield;
            bestScenario = {
                positionHyperliquid: hyperliquid,
                positionLighter: lighter,
                netFundingRateDiff: Math.abs(fundingDiff),
                fundingProfitPerHour,
                tradingFeesMaker,
                tradingFeesTaker,
                netProfitPerHourMaker,
                netProfitPerHourTaker,
                breakevenTimeMaker,
                breakevenTimeTaker,
                netDailyProfitMaker,
                netDailyProfitTaker,
                apyMarker,
                apyTaker
            };
        }
    });
    return bestScenario;
};

// Example Usage (Replace with real-time WebSocket data later)
// const exampleData = {
//     positionSizeUSD: 300000,
//     fundingRateHyperliquid: 0.0013, // % per hour
//     fundingRateLighter: 0.0106, // % per hour
//     makerFeeHyperliquid: 0.01, // %
//     takerFeeHyperliquid: 0.035 // %
// };

// console.log(calculateArbitrage(
//     exampleData.positionSizeUSD,
//     exampleData.fundingRateHyperliquid,
//     exampleData.fundingRateLighter,
//     exampleData.makerFeeHyperliquid,
//     exampleData.takerFeeHyperliquid
// ));

// Export the function
module.exports = {
    calculateArbitrage
};