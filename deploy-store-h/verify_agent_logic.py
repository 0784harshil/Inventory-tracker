
import sys
import logging
from sync_agent import SyncAgent

# Setup logging to console
logging.basicConfig(level=logging.INFO)

def main():
    print("="*50)
    print("   VERIFY AGENT LOGIC - CLASS TEST")
    print("="*50)
    
    try:
        # Initialize the agent (this tests config loading)
        print("Initializing SyncAgent...")
        agent = SyncAgent()
        print(f"Agent loaded. Store ID: {agent.local_store_id}")
        
    except Exception as e:
        print(f"❌ Failed to init agent: {e}")
        return

    while True:
        print("\n" + "-"*30)
        item_num = input("Enter Item Number (q to quit): ").strip()
        if item_num.lower() == 'q':
            break
            
        try:
            qty = float(input("Quantity to SUBTRACT: "))
        except:
            print("Invalid quantity")
            continue
            
        print(f"\nCalling agent.update_local_stock('{item_num}', {qty}, 'subtract')...")
        
        # Call the ACTUAL function used in production
        result = agent.update_local_stock(item_num, qty, 'subtract')
        
        print("\nRESULT:")
        print(result)
        
        if result['success']:
            print("✅ Agent says SUCCESS")
        else:
            print("❌ Agent says FAILURE")

if __name__ == "__main__":
    main()
