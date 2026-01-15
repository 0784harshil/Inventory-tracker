
import re

def remove_emojis(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to remove non-ascii characters (or specific emoji ranges)
    # But for safety, let's just replace the specific ones we know, 
    # OR replace any character > 127 with nothing? 
    # Actually, SQL connection string might need some special chars? No, mostly ASCII.
    # Let's target the emojis found clearly.
    
    replacements = {
        '🚀': '',
        '🕒': '',
        '✅': '[OK]',
        '📦': '',
        '❌': '[ERROR]',
        '⏸️': '',
        '⏭️': '[SKIP]',
        '⬇️': '[DOWN]',
        '📥': '[IN]',
        '⚠️': '[WARN]',
        '🛑': '[STOP]',
        '📂': ''
    }
    
    for emoji, text in replacements.items():
        content = content.replace(emoji, text)
        
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Cleaned {filename}")

if __name__ == "__main__":
    remove_emojis('store-h-agent.py')
    remove_emojis('store-k-agent.py')
