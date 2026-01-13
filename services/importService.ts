import { InventoryItem, Sale, SaleStatus, PaymentStatus, SaleType } from '../types.ts';

// Helper to clean currency strings (e.g., "$1,200.50" -> 1200.50)
const parseCurrency = (val: string): number => {
    if (!val) return 0;
    return parseFloat(val.replace(/[^0-9.-]+/g, '')) || 0;
};

// Helper to identify column index by keywords
const findColumnIndex = (headers: string[], keywords: string[]): number => {
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());
    return lowerHeaders.findIndex(h => keywords.some(k => h.includes(k)));
};

export const parseInventoryImport = (text: string): InventoryItem[] => {
    const rows = text.trim().split('\n');
    if (rows.length < 2) return [];

    // Detect separator: Excel copies as Tab (\t), CSV is comma (,)
    const separator = rows[0].includes('\t') ? '\t' : ',';
    
    // Parse Headers
    const headers = rows[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim());

    // Map columns
    const nameIdx = findColumnIndex(headers, ['title', 'name', 'item', 'description']);
    const skuIdx = findColumnIndex(headers, ['sku', 'label', 'custom label', 'stock number']);
    const qtyIdx = findColumnIndex(headers, ['qty', 'quantity', 'stock', 'available']);
    const priceIdx = findColumnIndex(headers, ['price', 'amount', 'value', 'buy it now']);
    const costIdx = findColumnIndex(headers, ['cost', 'unit cost']);
    const catIdx = findColumnIndex(headers, ['category', 'department']);

    if (nameIdx === -1 || priceIdx === -1) {
        throw new Error("Could not detect 'Item Name' or 'Price' columns. Please ensure your data has headers.");
    }

    const items: InventoryItem[] = [];

    // Iterate rows (skip header)
    for (let i = 1; i < rows.length; i++) {
        const rowStr = rows[i].trim();
        if (!rowStr) continue;

        // Simple split handling (robust enough for copy-paste)
        let cols: string[];
        if (separator === '\t') {
            cols = rowStr.split('\t');
        } else {
            // Regex to handle commas inside quotes for CSV
            const matches = rowStr.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            cols = matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : rowStr.split(',');
        }

        const name = cols[nameIdx] || 'Unknown Item';
        const price = parseCurrency(cols[priceIdx]);
        const quantity = qtyIdx > -1 ? parseCurrency(cols[qtyIdx]) : 1;
        const sku = skuIdx > -1 ? cols[skuIdx] : '';
        const costPrice = costIdx > -1 ? parseCurrency(cols[costIdx]) : 0;
        const category = catIdx > -1 ? cols[catIdx] : 'Imported';

        items.push({
            id: crypto.randomUUID(),
            name,
            sku: sku || `IMP-${Date.now()}-${i}`,
            quantity: quantity || 1, // Default to 1 if 0/missing
            costPrice,
            price,
            category,
            batchCode: ''
        });
    }

    return items;
};

export const parseSalesImport = (text: string): Sale[] => {
    const rows = text.trim().split('\n');
    if (rows.length < 2) return [];

    const separator = rows[0].includes('\t') ? '\t' : ',';
    const headers = rows[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim());

    const dateIdx = findColumnIndex(headers, ['date', 'paid', 'time', 'sold on']);
    const itemIdx = findColumnIndex(headers, ['item', 'title', 'name', 'description']);
    const customerIdx = findColumnIndex(headers, ['buyer', 'name', 'username', 'customer']);
    const qtyIdx = findColumnIndex(headers, ['qty', 'quantity']);
    const priceIdx = findColumnIndex(headers, ['total', 'price', 'amount', 'sold for']);
    const statusIdx = findColumnIndex(headers, ['status', 'shipped']);

    if (itemIdx === -1 || priceIdx === -1) {
        throw new Error("Could not detect 'Item' or 'Price/Total' columns. Please ensure your data has headers.");
    }

    const sales: Sale[] = [];

    for (let i = 1; i < rows.length; i++) {
        const rowStr = rows[i].trim();
        if (!rowStr) continue;

        let cols: string[];
        if (separator === '\t') {
            cols = rowStr.split('\t');
        } else {
            const matches = rowStr.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            cols = matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : rowStr.split(',');
        }

        const itemName = cols[itemIdx] || 'Unknown Item';
        const totalAmount = parseCurrency(cols[priceIdx]);
        const quantity = qtyIdx > -1 ? parseCurrency(cols[qtyIdx]) : 1;
        const unitPrice = totalAmount / (quantity || 1);
        const customerName = customerIdx > -1 ? cols[customerIdx] : 'Guest';
        
        let date = new Date().toISOString();
        if (dateIdx > -1 && cols[dateIdx]) {
            const parsedDate = new Date(cols[dateIdx]);
            if (!isNaN(parsedDate.getTime())) {
                date = parsedDate.toISOString();
            }
        }
        
        // Simple status detection
        let status = SaleStatus.TO_SHIP;
        if (statusIdx > -1) {
            const statusText = cols[statusIdx].toLowerCase();
            if (statusText.includes('ship') || statusText.includes('sent') || statusText.includes('complete')) {
                status = SaleStatus.SHIPPED;
            }
        }

        sales.push({
            id: crypto.randomUUID(),
            itemId: 'imported', 
            itemName,
            customerName,
            quantity: quantity || 1,
            unitPrice,
            costPrice: 0, 
            totalAmount,
            status,
            paymentStatus: PaymentStatus.PAID, // Assume imported sales are paid
            saleType: 'Sale',
            date
        });
    }

    return sales;
};