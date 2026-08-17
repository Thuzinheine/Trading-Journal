with open('app/page.tsx', 'r') as f:
    content = f.read()

lines = content.split('\n')
# Start from line 1830 (index 1829)
start_line = 1829
content_from_1830 = '\n'.join(lines[start_line:])

class JSXTagParser:
    def __init__(self, text, start_line):
        self.text = text
        self.pos = 0
        self.line = start_line + 1
        self.stack = []
        self.errors = []
        
    def peek(self, offset=0):
        if self.pos + offset < len(self.text):
            return self.text[self.pos + offset]
        return None
        
    def advance(self):
        char = self.text[self.pos]
        if char == '\n':
            self.line += 1
        self.pos += 1
        return char
        
    def parse(self):
        in_string = False
        string_char = None
        in_template = False
        
        while self.pos < len(self.text):
            char = self.peek()
            if char is None:
                break
                
            # Handle strings
            if in_string:
                if char == '\\':
                    self.advance() # skip escaped
                    self.advance()
                    continue
                if char == string_char:
                    in_string = False
                    self.advance()
                    continue
                self.advance()
                continue
                
            if in_template:
                if char == '\\':
                    self.advance()
                    self.advance()
                    continue
                if char == '`':
                    in_template = False
                    self.advance()
                    continue
                self.advance()
                continue
                
            if char in ['"', "'"]:
                in_string = True
                string_char = char
                self.advance()
                continue
                
            if char == '`':
                in_template = True
                self.advance()
                continue
                
            # Handle JSX Comments inside JSX: {/* ... */}
            if char == '{' and self.peek(1) == '/' and self.peek(2) == '*':
                self.pos += 3
                while self.pos < len(self.text):
                    if self.peek(0) == '*' and self.peek(1) == '/' and self.peek(2) == '}':
                        self.pos += 3
                        break
                    self.advance()
                continue

            # Handle standard JS comments: // and /*
            if char == '/' and self.peek(1) == '/':
                self.pos += 2
                while self.pos < len(self.text) and self.peek() != '\n':
                    self.advance()
                continue
            if char == '/' and self.peek(1) == '*':
                self.pos += 2
                while self.pos < len(self.text):
                    if self.peek(0) == '*' and self.peek(1) == '/':
                        self.pos += 2
                        break
                    self.advance()
                continue
                
            # Handle JSX Tags
            if char == '<' and self.peek(1) != ' ' and self.peek(1) != '=' and self.peek(1) != '<' and not self.peek(1).isdigit():
                # Possible tag
                # Check if comment start
                if self.peek(1) == '!' and self.peek(2) == '-' and self.peek(3) == '-':
                    self.pos += 4
                    while self.pos < len(self.text):
                        if self.peek(0) == '-' and self.peek(1) == '-' and self.peek(2) == '>':
                            self.pos += 3
                            break
                        self.advance()
                    continue
                    
                # Parse tag name and attributes
                self.advance() # consume '<'
                is_close = False
                if self.peek() == '/':
                    is_close = True
                    self.advance()
                    
                tag_name = ""
                while self.peek() and (self.peek().isalnum() or self.peek() in ['_', '.', '-']):
                    tag_name += self.advance()
                    
                # Read until closing '>' or '/>'
                is_self_closing = False
                while self.pos < len(self.text):
                    if self.peek() == '/' and self.peek(1) == '>':
                        is_self_closing = True
                        self.pos += 2
                        break
                    elif self.peek() == '>':
                        self.advance()
                        break
                    elif self.peek() in ['"', "'"]:
                        # skip string inside tag
                        s_char = self.advance()
                        while self.pos < len(self.text):
                            if self.peek() == '\\':
                                self.advance()
                                self.advance()
                            elif self.peek() == s_char:
                                self.advance()
                                break
                            else:
                                self.advance()
                    else:
                        self.advance()
                        
                if tag_name:
                    # Filter out TS castings/generics like `<string>`
                    # HTML tags are generally all lowercase or start with capital if React components
                    # But generics inside code are like `as string` or type parameters in functions.
                    # Since we are scanning from 1830, let's see if we encounter any.
                    if is_self_closing:
                        pass
                    elif is_close:
                        if not self.stack:
                            self.errors.append(f"Extra closing tag </{tag_name}> at line {self.line}")
                        else:
                            last_tag, last_line = self.stack.pop()
                            if last_tag != tag_name:
                                self.errors.append(f"Mismatch: </{tag_name}> at line {self.line} closing <{last_tag}> from line {last_line}")
                    else:
                        self.stack.append((tag_name, self.line))
                continue
                
            self.advance()

parser = JSXTagParser(content_from_1830, start_line)
parser.parse()

print("--- Open Tags Remaining ---")
for tag, line in parser.stack:
    print(f"Tag <{tag}> opened at line {line} not closed")

print("--- Errors found ---")
for err in parser.errors:
    print(err)
