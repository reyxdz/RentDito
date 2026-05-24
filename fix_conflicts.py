import re

with open('IMPLEMENTATION_PLAN.md', 'r') as f:
    content = f.read()

# We want to keep the block between <<<<<<< and =======, and remove the block between ======= and >>>>>>>
# Conflict format:
# <<<<<<< marcxdev-development
# OURS
# =======
# THEIRS
# >>>>>>> development

def replacer(match):
    return match.group(1)

# re.sub(pattern, replacement, string)
# pattern to match the conflict block
pattern = re.compile(r'<<<<<<< marcxdev-development\n(.*?)\n=======\n.*?\n>>>>>>> development\n', re.DOTALL)
fixed_content = pattern.sub(replacer, content)

with open('IMPLEMENTATION_PLAN.md', 'w') as f:
    f.write(fixed_content)

