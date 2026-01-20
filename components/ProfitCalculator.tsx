import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingUp,
  Percent,
  RefreshCw
} from 'lucide-react';

interface ProfitCalculatorProps {
  currency: 'PHP' | 'USD';
  exchangeRate: number;
}

const ProfitCalculator: React.FC<ProfitCalculatorProps> = ({ currency, exchangeRate }) => {
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [platformFee, setPlatformFee] = useState<string>('10');
  const [shippingCost, setShippingCost] = useState<string>('0');
  const [showUSD, setShowUSD] = useState(false);

  const buy = parseFloat(buyPrice) || 0;
  const sell = parseFloat(sellPrice) || 0;
  const fee = (parseFloat(platformFee) || 0) / 100;
  const shipping = parseFloat(shippingCost) || 0;

  const platformFeeAmount = sell * fee;
  const totalCost = buy + shipping;
  const netRevenue = sell - platformFeeAmount;
  const profit = netRevenue - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const margin = sell > 0 ? (profit / sell) * 100 : 0;

  const formatCurrency = (value: number) => {
    if (showUSD) {
      return `$${(value / exchangeRate).toFixed(2)}`;
    }
    return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const reset = () => {
    setBuyPrice('');
    setSellPrice('');
    setPlatformFee('10');
    setShippingCost('0');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-brand-600 rounded-xl flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Profit Calculator</h3>
            <p className="text-sm text-gray-400">Quick ROI calculations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUSD(!showUSD)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              showUSD 
                ? 'bg-brand-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showUSD ? 'USD' : 'PHP'}
          </button>
          <button
            onClick={reset}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Input Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buy Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₱</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sell Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₱</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform Fee</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                className="w-full pl-4 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Cost</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₱</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="pt-4 border-t border-gray-100 space-y-4">
          {/* Breakdown */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sell Price</span>
              <span className="text-gray-900 font-medium">{formatCurrency(sell)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform Fee ({platformFee}%)</span>
              <span className="text-red-500 font-medium">-{formatCurrency(platformFeeAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cost + Shipping</span>
              <span className="text-red-500 font-medium">-{formatCurrency(totalCost)}</span>
            </div>
            <div className="h-px bg-gray-200 my-2" />
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Net Profit</span>
              <span className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatCurrency(profit)}
              </span>
            </div>
          </div>

          {/* ROI and Margin */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-5 rounded-xl ${roi >= 30 ? 'bg-green-50' : roi >= 0 ? 'bg-amber-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-5 h-5 ${roi >= 30 ? 'text-green-600' : roi >= 0 ? 'text-amber-600' : 'text-red-500'}`} />
                <span className="text-sm font-medium text-gray-600">ROI</span>
              </div>
              <p className={`text-3xl font-bold ${roi >= 30 ? 'text-green-600' : roi >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                {roi.toFixed(1)}%
              </p>
            </div>
            <div className={`p-5 rounded-xl ${margin >= 20 ? 'bg-brand-50' : margin >= 0 ? 'bg-gray-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Percent className={`w-5 h-5 ${margin >= 20 ? 'text-brand-600' : margin >= 0 ? 'text-gray-600' : 'text-red-500'}`} />
                <span className="text-sm font-medium text-gray-600">Margin</span>
              </div>
              <p className={`text-3xl font-bold ${margin >= 20 ? 'text-brand-600' : margin >= 0 ? 'text-gray-700' : 'text-red-500'}`}>
                {margin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitCalculator;
