with open("src/google-10000-english.txt", "r") as f:
    t = f.read()
    t = t.replace('\n', '", "')
    t = f'["{t}"]'
    print(t)