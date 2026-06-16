import os
import re

directory = 'src'

replacements = {
    r'\bbg-white\b': 'bg-white/5',
    r'\bbg-slate-50\b': 'bg-white/[0.02]',
    r'\bbg-slate-100\b': 'bg-white/[0.04]',
    r'\bbg-slate-200\b': 'bg-white/[0.07]',
    r'\bbg-slate-300\b': 'bg-white/[0.10]',
    r'\bbg-gray-50\b': 'bg-white/[0.02]',
    r'\bbg-gray-100\b': 'bg-white/[0.04]',
    r'\bbg-gray-200\b': 'bg-white/[0.07]',
    
    r'\btext-slate-900\b': 'text-white',
    r'\btext-slate-800\b': 'text-white',
    r'\btext-slate-700\b': 'text-white/80',
    r'\btext-slate-600\b': 'text-white/60',
    r'\btext-slate-500\b': 'text-white/50',
    r'\btext-slate-400\b': 'text-white/40',
    r'\btext-slate-300\b': 'text-white/30',
    
    r'\btext-gray-900\b': 'text-white',
    r'\btext-gray-800\b': 'text-white',
    r'\btext-gray-700\b': 'text-white/80',
    r'\btext-gray-600\b': 'text-white/60',
    r'\btext-gray-500\b': 'text-white/50',
    r'\btext-gray-400\b': 'text-white/40',

    r'\bborder-slate-100\b': 'border-white/[0.06]',
    r'\bborder-slate-200\b': 'border-white/[0.08]',
    r'\bborder-slate-300\b': 'border-white/[0.12]',
    r'\bborder-gray-100\b': 'border-white/[0.06]',
    r'\bborder-gray-200\b': 'border-white/[0.08]',
    
    r'\bhover:bg-slate-100\b': 'hover:bg-white/[0.06]',
    r'\bhover:bg-slate-200\b': 'hover:bg-white/[0.10]',
    r'\bhover:bg-gray-100\b': 'hover:bg-white/[0.06]',
    
    r'\bhover:text-slate-900\b': 'hover:text-white',
    r'\bhover:text-gray-900\b': 'hover:text-white',
    
    r'placeholder:text-slate-[0-9]+': 'placeholder:text-white/25',
    r'placeholder:text-gray-[0-9]+': 'placeholder:text-white/25',
    
    # Also strip out the redundant dark: classes that we were trying to strip before
    r'\bdark:bg-white/5\b': '',
    r'\bdark:bg-white/\[0\.[0-9]+\]\b': '',
    r'\bdark:bg-black/[0-9]+\b': '',
    r'\bdark:bg-black/\[[0-9.]+\]\b': '',
    
    r'\bdark:text-white/[0-9]+\b': '',
    r'\bdark:text-white/\[[0-9.]+\]\b': '',
    r'\bdark:text-white\b': '',
    
    r'\bdark:border-white/[0-9]+\b': '',
    r'\bdark:border-white/\[[0-9.]+\]\b': '',
    
    r'\bdark:hover:bg-white/[0-9]+\b': '',
    r'\bdark:hover:text-white\b': '',
    
    r'\bdark:placeholder:text-white/[0-9]+\b': '',
    r'\bdark:placeholder:text-white/\[[0-9.]+\]\b': '',
}

def process_file(filepath):
    if not filepath.endswith('.tsx') and not filepath.endswith('.ts'):
        return
        
    with open(filepath, 'r') as f:
        content = f.read()
        
    original_content = content
    
    for pattern, replacement in replacements.items():
        content = re.sub(pattern, replacement, content)
        
    # clean up any double spaces that might result from stripping dark: classes
    content = re.sub(r' +', ' ', content)
    content = content.replace('className=" ', 'className="')
    content = content.replace(' "', '"')
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        process_file(os.path.join(root, file))

