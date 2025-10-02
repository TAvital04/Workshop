from questdb.ingress import Sender
import sine

conf = ""

with Sender.from_conf(conf) as sender:
    while True:
        y = sine.getY()
        
