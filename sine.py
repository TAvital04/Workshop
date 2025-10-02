import math

x = 0

def getY():
    global x

    result = math.sin(x)
    
    x += .001
    return result