# StockFlow User Training Guide

## Overview

StockFlow is a multi-store inventory management system that helps you:
- View real-time inventory across all store locations
- Create and manage stock transfers between stores
- Track inventory changes and movements
- Generate reports for auditing and analysis

---

## Getting Started

### Logging In
1. Open your web browser and navigate to the StockFlow URL
2. The system syncs automatically with your store's POS database

### Navigation
The **sidebar** on the left provides access to all main areas:

| Icon | Section | Purpose |
|------|---------|---------|
| 📊 | Dashboard | Overview of all stores and alerts |
| 📦 | Inventory | View and search all items |
| 🔄 | Transfers | Create and manage stock transfers |
| 🏪 | Stores | View store information and sync status |
| 📋 | Reports | Track inventory changes over time |

---

## Dashboard

The Dashboard provides a quick overview of your inventory system:

- **Total Items**: Number of unique products across all stores
- **Low Stock Alerts**: Items that are running low (red warning cards)
- **Store Status**: Each store's sync status and item count
- **Recent Activity**: Latest transfers and changes

### What to Look For
- 🔴 Red cards = Low stock alerts requiring attention
- 🟢 Green status = Store sync is working normally
- 🟡 Yellow status = Sync may be delayed

---

## Inventory

### Viewing Inventory
1. Click **📦 Inventory** in the sidebar
2. Use the **Store dropdown** to filter by location
3. Use the **Search box** to find specific items by name or UPC

### Understanding the Table
| Column | Description |
|--------|-------------|
| Item # | Unique identifier from POS system |
| Name | Product description |
| UPC | Barcode number |
| In Stock | Current quantity available |
| Price | Retail price |
| Store | Location of this inventory |

### Finding Low Stock Items
- Items with **0 or negative stock** are highlighted in red
- Use search to quickly find specific products

---

## Creating a Transfer

This is the main workflow for moving stock between stores.

### Step 1: Start a New Transfer
1. Click **🔄 Transfers** in the sidebar
2. Click the **"+ New Transfer"** button (top right)

### Step 2: Select Stores
1. **From Store**: Select the store sending items
2. **To Store**: Select the store receiving items
3. Wait for inventory to load

### Step 3: Add Items to Transfer
1. Browse or search for items in the left panel
2. Click **"+ Add"** next to each item you want to transfer
3. Adjust the **quantity** using the slider or input field
4. Repeat for all items needed

### Step 4: Submit Transfer
1. Review the items in your transfer (right panel)
2. Click **"Create Transfer"** to submit
3. The transfer is now **Pending** approval

---

## Transfer Workflow

Transfers go through these stages:

```
Pending → Approved → In Transit → Completed → Received
```

### Status Meanings

| Status | What It Means | Who Does It |
|--------|---------------|-------------|
| **Pending** | Waiting for approval | Created by any user |
| **Approved** | Ready to ship | Manager approves |
| **In Transit** | Items are being transported | Sync agent processes |
| **Completed** | Items arrived at destination | Receiving store confirms |
| **Received** | Stock updated at destination | Sync agent finalizes |

### Managing Transfers
From the Transfers page:
- **Approve**: Click "Approve" on pending transfers
- **Mark In Transit**: When items physically leave
- **Mark Completed**: When items arrive at destination
- **Cancel**: Cancel a pending transfer if needed

---

## Reports

Track all inventory changes for auditing and analysis.

### Viewing Reports
1. Click **📋 Reports** in the sidebar
2. View summary stats at the top:
   - Units Transferred Out
   - Units Transferred In  
   - Total Changes

### Filtering Reports
Use the filter bar to narrow results:
- **Store**: Filter by specific store
- **Type**: All Types, Transfer Out, Transfer In, Adjustment
- **From/To Date**: Select a date range

### Exporting Data
1. Click **"📥 Export CSV"** button
2. A CSV file will download with all visible data
3. Open in Excel for further analysis

### Understanding Change Types
| Type | Description |
|------|-------------|
| Transfer Out | Stock left this store |
| Transfer In | Stock arrived at this store |
| Adjustment | Manual inventory correction |

---

## Stores

### Viewing Store Information
1. Click **🏪 Stores** in the sidebar
2. See all registered store locations
3. Check sync status for each store

### Store Cards Show
- Store name and ID
- Items synced from POS
- Last sync timestamp
- Connection status

---

## Common Tasks

### Check if a specific item is in stock
1. Go to **Inventory**
2. Type the item name or UPC in Search
3. Check the "In Stock" column for each store

### Transfer items to another store
1. Go to **Transfers** → **New Transfer**
2. Select From/To stores
3. Add items and quantities
4. Submit and wait for approval

### Find out what was transferred last week
1. Go to **Reports**
2. Set the "From" date to 7 days ago
3. Review the list of changes

### Check why stock is different than expected
1. Go to **Reports**
2. Filter by the specific store
3. Review all changes to understand movements

---

## Troubleshooting

### "Sync Status" shows offline
- The sync agent on that store's computer may not be running
- Contact IT to restart the sync agent

### Transfer stuck in "Pending"
- A manager needs to approve the transfer
- Contact your manager to review pending transfers

### Item not showing in Inventory
- The item may not exist in the store's POS system
- Wait for the next sync cycle (every 30 seconds)
- Check if the store is online

### Reports showing no data
- Make sure the date range is correct
- Check that the store filter is set correctly
- Sync agents must be running to log changes

---

## Quick Reference

| Task | Where to Go |
|------|-------------|
| See overall status | Dashboard |
| Find an item | Inventory → Search |
| Create transfer | Transfers → New Transfer |
| Approve transfer | Transfers → Click Approve |
| View change history | Reports |
| Check store status | Stores |
| Export data | Reports → Export CSV |

---

## Need Help?

Contact your system administrator if you experience:
- Persistent sync issues
- Unable to access the system
- Data discrepancies
- Any error messages
