with open("src/20k.txt", "r") as f: # shush
    t = f.read()
    t = t.replace('\n', '", "')
    t = f'["{t}"]'
    print(t)