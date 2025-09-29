import db
import time

a = 1
b = 2
c = 3
d = a + b + c

while True:
    columns = {
        "a": a,
        "b": b,
        "c": c,
        "d": d
    }

    db.send(columns)

    a += 1
    b += 2
    c += 3
    d = a + b + c

    time.sleep(5)