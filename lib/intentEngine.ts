export function processIntent(text: string, context: { bookings?: any[], tables?: any[] }): string {
  const lower = text.toLowerCase();
  
  // 1. Bookings Check
  if (lower.includes('booking') && (lower.includes('today') || lower.includes('how many'))) {
    const confirmed = context.bookings?.filter(b => b.status === 'confirmed').length || 0;
    const pending = context.bookings?.filter(b => b.status === 'pending').length || 0;
    return `📊 **Booking Status:**\nYou have **${confirmed} confirmed** and **${pending} pending** bookings right now.`;
  }

  // 2. Tables Check
  if (lower.includes('table') && (lower.includes('free') || lower.includes('available'))) {
    const freeTables = context.tables?.filter(t => t.status === 'available' || t.status === 'free');
    if (!freeTables || freeTables.length === 0) return `🚨 We are fully packed! There are **no free tables** currently available.`;
    
    // Group sizes
    const sizes = freeTables.map(t => `Table ${t.tableNumber || t.id} (${t.capacity} pax)`).join('\n• ');
    return `🍽️ **Available Tables (${freeTables.length}):**\n• ${sizes}`;
  }

  // 3. Busy / Occupancy
  if (lower.includes('busy') || lower.includes('occupancy')) {
    const occupied = context.tables?.filter(t => t.status === 'occupied').length || 0;
    const total = context.tables?.length || 1;
    const percentage = Math.round((occupied / total) * 100);
    return `🔥 **Current Floor Load:**\nWe are operating at **${percentage}% capacity** (${occupied} out of ${total} tables occupied).`;
  }

  // 4. Revenue / Sales
  if (lower.includes('revenue') || lower.includes('sales') || lower.includes('money')) {
     return `💰 **Sales Snapshot:**\nSimulated online revenue for today is **₹42,500**. Check the Dashboard for precise itemized breakdown.`;
  }
  
  // 5. Cancellations / Edits
  if (lower.includes('cancel') || lower.includes('edit')) {
    return `⚠️ **Action Required:**\nTo cancel or edit a guest's booking, please head to the **Bookings Tab**, tap their name, and update the status there. I currently only have read-access to protect the floor data!`;
  }

  // Default Fallback (Layer 2 Simulation)
  return `🤔 I didn't quite catch that. Since I'm running in ultra-fast **Offline Smart Mode**, try asking me:\n\n• "How many bookings today?"\n• "Are there any free tables?"\n• "Is it busy right now?"`;
}
