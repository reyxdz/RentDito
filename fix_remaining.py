with open('IMPLEMENTATION_PLAN.md', 'r') as f:
    content = f.read()

content = content.replace('<<<<<<< marcxdev-development\n', '')
content = content.replace('**________________________________________ D O N E ________________________________________**---', '**________________________________________ D O N E ________________________________________**\n---')

with open('IMPLEMENTATION_PLAN.md', 'w') as f:
    f.write(content)
