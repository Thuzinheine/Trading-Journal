with open('app/page.tsx', 'r') as f:
    content = f.read()

brace_stack = []
paren_stack = []
in_template = False
escaped = False

abs_line = 1
for i, char in enumerate(content):
    if char == '\n':
        abs_line += 1
        
    if char == '\\' and not escaped:
        escaped = True
        continue
    if char == '`' and not escaped:
        in_template = not in_template
    escaped = False
    
    if not in_template:
        if char == '{':
            brace_stack.append(abs_line)
        elif char == '}':
            if brace_stack:
                brace_stack.pop()
            else:
                print(f"Extra closing brace at line {abs_line}")
        elif char == '(':
            paren_stack.append(abs_line)
        elif char == ')':
            if paren_stack:
                paren_stack.pop()
            else:
                print(f"Extra closing parenthesis at line {abs_line}")

print("--- Open Braces Remaining ---")
for line in brace_stack[:10]:
    print(f"Brace opened at line {line} not closed")

print("--- Open Parentheses Remaining ---")
for line in paren_stack[:10]:
    print(f"Parenthesis opened at line {line} not closed")
