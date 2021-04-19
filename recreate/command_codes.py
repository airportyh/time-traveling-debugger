f = open("command_codes.txt", "r")
commands = []
for line in f:
    line = line.rstrip()
    code, cmd = line.split(" ")
    # code = int(code) % 997
    commands.append((code, cmd))
f.close()

commands.sort()

for cmd in commands:
    print(cmd)

codes = list(map(lambda cmd: cmd[0], commands))
uniq_codes = set(codes)
if len(codes) > len(uniq_codes):
    print("There are duplicate codes")