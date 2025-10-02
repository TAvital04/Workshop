from questdb.ingress import Sender
from datetime import datetime
import sine

conf = 'http::addr=localhost:9000;'
table_name = 'telemetry-data'

with Sender.from_conf(conf) as sender:
    while True:
        y = sine.getY()

        sender.row(
            table_name,
            columns = {
                'yValues': y
            },
            at = datetime.now()
        )

        print(y)

        sender.flush()
        
